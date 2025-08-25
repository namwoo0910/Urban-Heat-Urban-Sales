import pandas as pd
import geopandas as gpd
import numpy as np
import json
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

class SeoulCentroidInterpolator:
    """
    행정동의 무게중심(centroid)을 기준으로 인구를 격자 셀에 분배하는 시스템
    
    - 각 행정동의 무게중심에서 인근 격자 셀들로 거리 기반 가중치로 분산
    - 처리 CRS: 등가면적/미터 단위(EPSG:5186; Korea 2000 / Central Belt)  
    - 출력 CRS: WGS84(EPSG:4326)로 변환하여 Mapbox에서 바로 사용 가능
    - 분배 방식: 가우시안 거리 가중치 또는 역거리 가중치
    - 선택적 스무딩: 추가 가우시안 블러로 더욱 부드럽게
    """

    def __init__(self, grid_size=80, crs_equal_area="EPSG:5186", crs_wgs84="EPSG:4326",
                 distribution_method='gaussian', distribution_radius=1000.0,
                 enable_smoothing=True, smoothing_sigma_m=500.0):
        self.grid_size = grid_size
        self.crs_equal_area = crs_equal_area
        self.crs_wgs84 = crs_wgs84
        self.distribution_method = distribution_method  # 'gaussian', 'inverse_distance', 'nearest'
        self.distribution_radius = float(distribution_radius)  # 분배 반경(m)
        self.enable_smoothing = enable_smoothing
        self.smoothing_sigma_m = float(smoothing_sigma_m)

        self.boundary_gdf = None       # 행정동 경계 (equal-area CRS)
        self.centroids_gdf = None      # 행정동 무게중심들
        self.grid_cells = None         # 필터링된 그리드 셀(폴리곤, equal-area CRS)
        self.grid_centroids = None     # 그리드 셀 중심점들
        self.population_df = None      # index=adm_cd, columns=time, values=Pop
        self.weights = None            # {adm_cd: {grid_id: weight}}
        self.grid_data = {}            # {time: {grid_id: pop}}

        # 격자 메타(셀 크기/개수)
        self.nx = self.grid_size
        self.ny = self.grid_size
        self.dx = None  # meters per cell
        self.dy = None

    # ------------------------------
    # Data loading
    # ------------------------------
    def load_data(self, geojson_path, csv_path):
        print("📂 데이터 로드 중…")
        bdry = gpd.read_file(geojson_path)
        if bdry.crs is None:
            bdry.set_crs(self.crs_wgs84, inplace=True)
        
        if "adm_cd" not in bdry.columns:
            raise ValueError("boundary geojson에 'adm_cd' 컬럼이 없습니다.")
        bdry["adm_cd"] = bdry["adm_cd"].astype(str)
        bdry["geometry"] = bdry["geometry"].buffer(0)
        
        # 등가면적 좌표계로 변환
        self.boundary_gdf = bdry.to_crs(self.crs_equal_area)
        
        # 무게중심 계산
        print("🎯 행정동 무게중심 계산 중…")
        centroids = self.boundary_gdf.copy()
        centroids["geometry"] = centroids.geometry.centroid
        self.centroids_gdf = centroids[["adm_cd", "geometry"]].copy()
        
        print(f"   ✅ 행정동 경계: {len(self.boundary_gdf)}개")
        print(f"   ✅ 무게중심: {len(self.centroids_gdf)}개")

        # CSV 로드
        df = pd.read_csv(csv_path)
        if not {"Date", "adm_cd", "Pop"}.issubset(df.columns):
            raise ValueError("CSV에는 Date, adm_cd, Pop 컬럼이 필요합니다.")
        df["Date"] = pd.to_datetime(df["Date"])
        df["Hour"] = df["Date"].dt.strftime("%H:00")
        df["adm_cd"] = df["adm_cd"].astype(str)

        popdf = df.pivot_table(index="adm_cd", columns="Hour", values="Pop", aggfunc="mean").fillna(0)
        valid = set(self.boundary_gdf["adm_cd"].astype(str))
        popdf = popdf[popdf.index.isin(valid)]
        popdf = popdf.sort_index()
        self.population_df = popdf
        print(f"   ✅ 인구 데이터: {len(self.population_df)}개 동, {len(self.population_df.columns)}개 시간대")

    # ------------------------------
    # Grid creation & filtering
    # ------------------------------
    def create_grid_cells(self):
        print("🗺️  그리드 생성 중… (폴리곤 셀)")
        minx, miny, maxx, maxy = self.boundary_gdf.total_bounds
        nx = ny = self.grid_size
        dx = (maxx - minx) / nx
        dy = (maxy - miny) / ny
        self.dx, self.dy = dx, dy
        self.nx, self.ny = nx, ny
        
        cells = []
        gid = 0
        for r in range(ny):
            y0 = miny + r * dy
            for c in range(nx):
                x0 = minx + c * dx
                poly = Polygon([(x0, y0), (x0+dx, y0), (x0+dx, y0+dy), (x0, y0+dy)])
                cells.append({
                    "grid_id": gid,
                    "row": r,
                    "col": c,
                    "geometry": poly
                })
                gid += 1
        
        grid = gpd.GeoDataFrame(cells, geometry="geometry", crs=self.crs_equal_area)
        print(f"   📦 전체 셀 수: {len(grid)} ( {nx} x {ny} )")

        # 서울 경계와 교차하는 셀만 유지
        print("🔍 서울 내부와 교차하는 셀 필터링…")
        seoul_union = unary_union(self.boundary_gdf.geometry)
        grid = grid[grid.geometry.intersects(seoul_union)].copy()
        grid.reset_index(drop=True, inplace=True)
        grid["grid_id"] = range(len(grid))
        self.grid_cells = grid
        
        # 격자 셀 중심점 계산
        print("📍 격자 셀 중심점 계산 중…")
        grid_centroids = self.grid_cells.copy()
        grid_centroids["geometry"] = grid_centroids.geometry.centroid
        self.grid_centroids = grid_centroids[["grid_id", "geometry"]].copy()
        
        print(f"   ✅ 유지된 셀: {len(self.grid_cells)} (서울 내부 교차)")
        print(f"   ✅ 격자 중심점: {len(self.grid_centroids)}개")

    # ------------------------------
    # Distance-based weight calculation
    # ------------------------------
    def build_centroid_weights(self):
        print(f"🧮 무게중심 기반 거리 가중치 계산 중… (방식: {self.distribution_method})")
        print(f"   📏 분배 반경: {self.distribution_radius:.0f}m")
        
        weights = {}
        
        for _, dong_row in tqdm(self.centroids_gdf.iterrows(), 
                              total=len(self.centroids_gdf), desc="행정동 처리"):
            adm_cd = dong_row["adm_cd"]
            dong_point = dong_row["geometry"]
            
            # 각 격자 셀과의 거리 계산
            distances = []
            grid_ids = []
            
            for _, grid_row in self.grid_centroids.iterrows():
                grid_id = grid_row["grid_id"]
                grid_point = grid_row["geometry"]
                distance = dong_point.distance(grid_point)  # meters (equal-area CRS)
                
                # 분배 반경 내의 셀만 고려
                if distance <= self.distribution_radius:
                    distances.append(distance)
                    grid_ids.append(grid_id)
            
            if not distances:
                # 반경 내에 셀이 없으면 가장 가까운 셀 1개 선택
                min_dist = float('inf')
                nearest_grid = None
                for _, grid_row in self.grid_centroids.iterrows():
                    grid_point = grid_row["geometry"]
                    distance = dong_point.distance(grid_point)
                    if distance < min_dist:
                        min_dist = distance
                        nearest_grid = grid_row["grid_id"]
                distances = [min_dist]
                grid_ids = [nearest_grid]
            
            # 거리 기반 가중치 계산
            cell_weights = self._calculate_weights(distances)
            
            # 정규화 (합이 1이 되도록)
            total_weight = sum(cell_weights)
            if total_weight > 0:
                cell_weights = [w / total_weight for w in cell_weights]
            
            # 저장
            weights[adm_cd] = {}
            for grid_id, weight in zip(grid_ids, cell_weights):
                weights[adm_cd][grid_id] = weight
        
        self.weights = weights
        
        # 검증 출력
        avg_cells_per_dong = np.mean([len(w) for w in weights.values()])
        print(f"   ✅ 동당 평균 영향받는 셀 수: {avg_cells_per_dong:.1f}개")

    def _calculate_weights(self, distances):
        """거리 배열을 가중치 배열로 변환"""
        distances = np.array(distances)
        
        if self.distribution_method == 'gaussian':
            # 가우시안 가중치: exp(-d²/2σ²)
            sigma = self.distribution_radius / 3.0  # 3σ = radius
            weights = np.exp(-(distances ** 2) / (2 * sigma ** 2))
            
        elif self.distribution_method == 'inverse_distance':
            # 역거리 가중치: 1/(1+d)
            weights = 1.0 / (1.0 + distances)
            
        elif self.distribution_method == 'nearest':
            # 가장 가까운 셀에만 모든 가중치
            nearest_idx = np.argmin(distances)
            weights = np.zeros_like(distances)
            weights[nearest_idx] = 1.0
            
        else:
            raise ValueError(f"Unknown distribution method: {self.distribution_method}")
        
        return weights.tolist()

    # ------------------------------
    # Population allocation
    # ------------------------------
    def calculate_grid_population(self):
        if self.weights is None:
            raise RuntimeError("가중치가 없습니다. build_centroid_weights()를 먼저 실행하세요.")
        
        time_cols = list(self.population_df.columns)
        adm_index = self.population_df.index.astype(str)
        adm_set = set(adm_index)

        print("📦 시간대별 그리드 인구 계산 (무게중심 기반)…")
        self.grid_data = {}
        
        for t in tqdm(time_cols, desc="시간대"):
            grid_pop = {}
            # 모든 격자 셀을 0으로 초기화
            for grid_id in self.grid_centroids["grid_id"]:
                grid_pop[str(grid_id)] = 0.0
            
            # 각 행정동의 인구를 가중치에 따라 분배
            for adm_cd in adm_set:
                if adm_cd in self.weights:
                    dong_pop = float(self.population_df.loc[adm_cd, t])
                    for grid_id, weight in self.weights[adm_cd].items():
                        grid_pop[str(grid_id)] += dong_pop * weight
            
            self.grid_data[t] = grid_pop

        # 선택적 스무딩
        if self.enable_smoothing and self.smoothing_sigma_m > 0:
            print(f"🌫️  추가 스무딩 적용 (σ≈{self.smoothing_sigma_m:.0f} m)")
            self._smooth_all_times_normalized()

        # 검증: 총합 보존 여부
        for t in time_cols[:3]:
            total_dong = float(self.population_df[t].sum())
            total_grid = float(sum(self.grid_data[t].values()))
            print(f"   🧾 검증[{t}] 동합={total_dong:.3f}, 그리드합={total_grid:.3f}, 차이={total_grid-total_dong:.6f}")

    # ------------------------------
    # Smoothing (동일한 방식 유지)
    # ------------------------------
    def _gaussian_kernel1d(self, sigma_cells):
        import math
        if sigma_cells <= 0:
            return np.array([1.0])
        radius = int(math.ceil(3.0 * float(sigma_cells)))
        x = np.arange(-radius, radius+1, dtype=float)
        k = np.exp(-(x*x)/(2.0*sigma_cells*sigma_cells))
        k /= k.sum()
        return k

    def _normalized_gaussian_blur(self, arr, mask, sigma_cells_y, sigma_cells_x):
        kx = self._gaussian_kernel1d(sigma_cells_x)
        ky = self._gaussian_kernel1d(sigma_cells_y)

        def conv1d_horiz(a, k):
            pad = len(k)//2
            a_pad = np.pad(a, ((0,0),(pad,pad)), mode='edge')
            out = np.empty_like(a, dtype=float)
            for r in range(a.shape[0]):
                out[r] = np.convolve(a_pad[r], k, mode='valid')
            return out

        def conv1d_vert(a, k):
            pad = len(k)//2
            a_pad = np.pad(a, ((pad,pad),(0,0)), mode='edge')
            out = np.empty_like(a, dtype=float)
            for c in range(a.shape[1]):
                out[:, c] = np.convolve(a_pad[:, c], k, mode='valid')
            return out

        num = arr.copy()
        den = mask.copy()
        num = conv1d_horiz(num, kx)
        num = conv1d_vert(num, ky)
        den = conv1d_horiz(den, kx)
        den = conv1d_vert(den, ky)
        out = np.zeros_like(arr, dtype=float)
        valid = den > 1e-12
        out[valid] = num[valid] / den[valid]
        return out

    def _smooth_all_times_normalized(self):
        nx, ny = self.nx, self.ny
        dx, dy = self.dx, self.dy
        sigma_x = max(self.smoothing_sigma_m / dx, 1e-6)
        sigma_y = max(self.smoothing_sigma_m / dy, 1e-6)

        rc = self.grid_cells[["grid_id","row","col"]].copy()
        rc_dict = {int(r.grid_id):(int(r.row), int(r.col)) for r in rc.itertuples(index=False)}

        for t, gmap in self.grid_data.items():
            arr = np.zeros((ny, nx), dtype=float)
            mask = np.zeros((ny, nx), dtype=float)
            
            for gid_str, val in gmap.items():
                gid = int(gid_str)
                if gid in rc_dict:
                    r, c = rc_dict[gid]
                    arr[r, c] = float(val)
                    mask[r, c] = 1.0

            total_before = float(arr[mask>0].sum())
            sm = self._normalized_gaussian_blur(arr, mask, sigma_y, sigma_x)
            sm *= mask
            total_after = float(sm.sum())
            if total_after > 0:
                sm *= (total_before / total_after)

            newmap = {}
            for gid_str in gmap.keys():
                gid = int(gid_str)
                if gid in rc_dict:
                    r, c = rc_dict[gid]
                    newmap[gid_str] = float(sm[r, c])
                else:
                    newmap[gid_str] = 0.0
            self.grid_data[t] = newmap

    # ------------------------------
    # Save outputs
    # ------------------------------
    def save_results(self, output_dir="./processed_data"):
        import os
        os.makedirs(output_dir, exist_ok=True)
        print("💾 결과 저장…")

        # 1) 그리드 셀 GeoJSON (WGS84)
        grid_out = self.grid_cells.to_crs(self.crs_wgs84).copy()
        grid_out["row"] = grid_out["row"].astype(int)
        grid_out["col"] = grid_out["col"].astype(int)
        grid_out["grid_id"] = grid_out["grid_id"].astype(int)
        grid_geojson_path = os.path.join(output_dir, "grid_cells.geojson")
        grid_out.to_file(grid_geojson_path, driver="GeoJSON")
        print(f"   ✅ 그리드 셀(GeoJSON): {grid_geojson_path}")

        # 2) 무게중심 GeoJSON (디버깅/시각화용)
        centroids_out = self.centroids_gdf.to_crs(self.crs_wgs84).copy()
        centroids_path = os.path.join(output_dir, "dong_centroids.geojson")
        centroids_out.to_file(centroids_path, driver="GeoJSON")
        print(f"   ✅ 동 무게중심(GeoJSON): {centroids_path}")

        # 3) 그리드 인구 JSON
        grid_pop_path = os.path.join(output_dir, "grid_population.json")
        with open(grid_pop_path, "w", encoding="utf-8") as f:
            json.dump(self.grid_data, f, ensure_ascii=False)
        print(f"   ✅ 그리드 인구(JSON): {grid_pop_path}")

        # 4) 메타데이터
        meta = {
            "grid_size": self.grid_size,
            "crs_processing": self.crs_equal_area,
            "crs_output": self.crs_wgs84,
            "n_cells": int(len(self.grid_cells)),
            "time_periods": list(self.grid_data.keys()),
            "distribution": {
                "method": self.distribution_method,
                "radius_m": float(self.distribution_radius)
            },
            "smoothing": {
                "enabled": bool(self.enable_smoothing),
                "sigma_m": float(self.smoothing_sigma_m)
            },
            "description": "서울 유동인구 그리드(무게중심 기반 거리 가중 분배, Mapbox용 폴리곤)"
        }
        meta_path = os.path.join(output_dir, "metadata.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        print(f"   ✅ 메타데이터: {meta_path}")


# ------------------------------
# 실행 예시
# ------------------------------

def main():
    print("🏙️ 서울 유동인구 무게중심 기반 보간 시작…")
    print("="*60)

    # 다양한 분배 방식 비교를 위한 설정들
    configs = {
        "gaussian_1km": {
            "distribution_method": "gaussian",
            "distribution_radius": 1000.0,
            "smoothing_sigma_m": 1000.0
        },
        "gaussian_500m": {
            "distribution_method": "gaussian", 
            "distribution_radius": 500.0,
            "smoothing_sigma_m": 300.0
        },
        "inverse_distance": {
            "distribution_method": "inverse_distance",
            "distribution_radius": 800.0,
            "smoothing_sigma_m": 500.0
        },
        "nearest_only": {
            "distribution_method": "nearest",
            "distribution_radius": 1000.0,  # 이 경우 의미없음
            "smoothing_sigma_m": 800.0
        }
    }

    # 추천: gaussian_1km 방식 (가장 자연스러운 분산)
    selected_config = "gaussian_1km"
    config = configs[selected_config]
    
    proc = SeoulCentroidInterpolator(
        grid_size=80,
        crs_equal_area="EPSG:5186",
        crs_wgs84="EPSG:4326",
        enable_smoothing=True,
        **config
    )

    print(f"📋 선택된 설정: {selected_config}")
    print(f"   - 분배방식: {config['distribution_method']}")
    print(f"   - 분배반경: {config['distribution_radius']:.0f}m")
    print(f"   - 스무딩: {config['smoothing_sigma_m']:.0f}m")
    print()

    proc.load_data(geojson_path="./data/bdry.geojson", csv_path="./data/sample.csv")
    proc.create_grid_cells()
    proc.build_centroid_weights()
    proc.calculate_grid_population()
    proc.save_results()

    print("🎉 완료! 출력 파일:")
    print("  - ./processed_data/grid_cells.geojson     (Mapbox 폴리곤 레이어)")
    print("  - ./processed_data/dong_centroids.geojson (행정동 무게중심)")
    print("  - ./processed_data/grid_population.json   (시간→grid_id→value)")
    print("  - ./processed_data/metadata.json")


if __name__ == "__main__":
    main()