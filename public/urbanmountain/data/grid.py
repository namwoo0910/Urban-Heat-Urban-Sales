import pandas as pd
import geopandas as gpd
import numpy as np
import json
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import pyproj
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

class SeoulGridProcessor:
    def __init__(self, grid_size=100, smooth_factor=2.0):
        """
        서울 인구 데이터를 그리드로 변환하는 클래스
        
        Args:
            grid_size (int): 그리드 해상도 (nxn)
            smooth_factor (float): 스무딩 강도 (높을수록 더 부드러움)
        """
        self.grid_size = grid_size
        self.smooth_factor = smooth_factor
        self.boundary_gdf = None
        self.population_df = None
        self.grid_points = None
        self.grid_data = {}
        
    def load_data(self, geojson_path, csv_path):
        """데이터 로드"""
        print("📂 데이터 로딩 중...")
        
        # GeoJSON 로드
        self.boundary_gdf = gpd.read_file(geojson_path)
        print(f"   ✅ 행정동 경계: {len(self.boundary_gdf)} 개 구역")
        
        # CSV 로드 및 전처리
        df = pd.read_csv(csv_path)
        df['Date'] = pd.to_datetime(df['Date'])
        df['Hour'] = df['Date'].dt.strftime('%H:00')
        df['adm_cd'] = df['adm_cd'].astype(str)
        
        # 피벗 테이블로 변환 (시간대별 인구 데이터)
        self.population_df = df.pivot_table(
            index='adm_cd', 
            columns='Hour', 
            values='Pop', 
            aggfunc='mean'
        ).fillna(0)
        
        print(f"   ✅ 인구 데이터: {len(self.population_df)} 개 구역, {len(self.population_df.columns)} 시간대")
        
    def create_grid(self):
        """서울 전역에 그리드 생성 (경계 정보 포함)"""
        print("🗺️  그리드 생성 중...")
        
        # 서울 전체 경계 계산
        bounds = self.boundary_gdf.total_bounds
        min_x, min_y, max_x, max_y = bounds
        
        print(f"   📍 서울 경계: ({min_x:.6f}, {min_y:.6f}) ~ ({max_x:.6f}, {max_y:.6f})")
        
        # 그리드 좌표 생성
        x_coords = np.linspace(min_x, max_x, self.grid_size)
        y_coords = np.linspace(min_y, max_y, self.grid_size)
        
        # 그리드 셀 크기 계산
        grid_width = (max_x - min_x) / (self.grid_size - 1)
        grid_height = (max_y - min_y) / (self.grid_size - 1)
        
        print(f"   📏 그리드 셀 크기: {grid_width:.6f}° x {grid_height:.6f}° (약 {grid_width*111:.0f}m x {grid_height*111:.0f}m)")
        
        # 그리드 포인트들 생성 (경계 정보 포함)
        grid_points = []
        grid_coords = []
        
        for i, y in enumerate(y_coords):
            for j, x in enumerate(x_coords):
                grid_id = i * self.grid_size + j
                point = Point(x, y)
                
                # 그리드 셀의 경계 계산
                half_width = grid_width / 2
                half_height = grid_height / 2
                
                bounds = {
                    'minLng': x - half_width,
                    'maxLng': x + half_width,
                    'minLat': y - half_height,
                    'maxLat': y + half_height
                }
                
                # 미터 단위 크기도 계산
                width_meters = grid_width * 111000  # 대략적인 변환
                height_meters = grid_height * 111000
                
                grid_points.append({
                    'grid_id': grid_id,
                    'geometry': point,
                    'lng': x,
                    'lat': y,
                    'row': i,
                    'col': j,
                    'bounds': bounds,
                    'size_meters': {
                        'width': width_meters,
                        'height': height_meters
                    }
                })
                
                grid_coords.append({
                    'grid_id': grid_id,
                    'lng': x,
                    'lat': y,
                    'row': i,
                    'col': j,
                    'bounds': bounds,
                    'size_meters': {
                        'width': width_meters,
                        'height': height_meters
                    }
                })
        
        self.grid_points = gpd.GeoDataFrame(grid_points)
        self.grid_coords = grid_coords
        
        print(f"   ✅ {len(self.grid_points)} 개 그리드 포인트 생성 완료 (경계 정보 포함)")
        
    def filter_grids_in_seoul(self):
        """서울 행정동 내부에 포함된 그리드만 필터링 (경계 정보 유지)"""
        print("🔍 서울 경계 내부 그리드 필터링 중...")
        
        # 서울 전체 경계 생성 (모든 행정동 합치기)
        seoul_boundary = self.boundary_gdf.geometry.unary_union
        
        # 각 그리드 포인트가 서울 내부에 있는지 확인
        valid_grids = []
        valid_coords = []
        
        for idx, grid_row in tqdm(self.grid_points.iterrows(), 
                                 total=len(self.grid_points), 
                                 desc="그리드 필터링"):
            point = grid_row['geometry']
            
            # 서울 경계 내부에 포함되는지 확인
            if seoul_boundary.contains(point):
                valid_grids.append(grid_row)
                
                # 좌표 정보도 함께 저장 (경계 정보 포함)
                valid_coords.append({
                    'grid_id': grid_row['grid_id'],
                    'lng': grid_row['lng'],
                    'lat': grid_row['lat'],
                    'row': grid_row['row'],
                    'col': grid_row['col'],
                    'bounds': grid_row['bounds'],
                    'size_meters': grid_row['size_meters']
                })
        
        # 필터링된 그리드로 업데이트
        self.grid_points = gpd.GeoDataFrame(valid_grids).reset_index(drop=True)
        self.grid_coords = valid_coords
        
        # 그리드 ID 다시 매핑 (연속적인 번호로)
        old_to_new_id = {}
        for new_idx, grid_row in self.grid_points.iterrows():
            old_id = grid_row['grid_id']
            old_to_new_id[old_id] = new_idx
            
        # 그리드 포인트 ID 업데이트
        for i in range(len(self.grid_points)):
            self.grid_points.iloc[i, self.grid_points.columns.get_loc('grid_id')] = i
            
        # 좌표 정보 ID 업데이트
        for i, coord in enumerate(self.grid_coords):
            coord['grid_id'] = i
        
        # 인구 데이터도 새 ID로 매핑
        if hasattr(self, 'grid_data') and self.grid_data:
            new_grid_data = {}
            for time_col, time_data in self.grid_data.items():
                new_time_data = {}
                for old_id, population in time_data.items():
                    old_id_int = int(old_id)
                    if old_id_int in old_to_new_id:
                        new_id = old_to_new_id[old_id_int]
                        new_time_data[str(new_id)] = population
                new_grid_data[time_col] = new_time_data
            self.grid_data = new_grid_data
        
        print(f"   ✅ 필터링 완료: {len(self.grid_coords)} 개 그리드 (서울 내부만)")
        print(f"   🗑️  제거된 그리드: {self.grid_size * self.grid_size - len(self.grid_coords)} 개")
        
        # 필터링 통계
        total_area = self.grid_size * self.grid_size
        seoul_area = len(self.grid_coords)
        coverage = (seoul_area / total_area) * 100
        print(f"   📊 서울 면적 비율: {coverage:.1f}%")
        
        # 샘플 그리드 정보 출력
        if len(self.grid_coords) > 0:
            sample = self.grid_coords[0]
            print(f"   📝 샘플 그리드 정보:")
            print(f"      중심: ({sample['lng']:.6f}, {sample['lat']:.6f})")
            print(f"      경계: ({sample['bounds']['minLng']:.6f}, {sample['bounds']['minLat']:.6f}) ~ ({sample['bounds']['maxLng']:.6f}, {sample['bounds']['maxLat']:.6f})")
            print(f"      크기: {sample['size_meters']['width']:.1f}m x {sample['size_meters']['height']:.1f}m")

    def calculate_grid_population(self):
        """각 그리드 포인트의 인구값 계산 (서울 내부 그리드만)"""
        print("🧮 서울 내부 그리드별 인구 데이터 계산 중...")
        
        # 행정동 중심점 계산
        centroids = {}
        for idx, row in self.boundary_gdf.iterrows():
            adm_cd = str(row['adm_cd'])
            centroid = row['geometry'].centroid
            centroids[adm_cd] = (centroid.x, centroid.y)
        
        # 각 시간대별로 처리
        time_columns = list(self.population_df.columns)
        
        for time_col in tqdm(time_columns, desc="시간대 처리"):
            grid_populations = {}
            
            for grid_idx, grid_row in self.grid_points.iterrows():
                grid_lng = grid_row['lng']
                grid_lat = grid_row['lat']
                grid_id = grid_row['grid_id']
                
                total_weighted_pop = 0
                total_weight = 0
                
                # 각 행정동으로부터의 영향 계산
                for adm_cd, (center_lng, center_lat) in centroids.items():
                    if adm_cd not in self.population_df.index:
                        continue
                        
                    # 거리 계산 (대략적인 미터 단위)
                    distance = self._calculate_distance(
                        grid_lng, grid_lat, center_lng, center_lat
                    )
                    
                    # 가우시안 가중치 계산 (거리가 멀수록 영향 감소)
                    weight = np.exp(-(distance ** 2) / (2 * (self.smooth_factor * 1000) ** 2))
                    
                    # 해당 행정동이 그리드 포인트를 포함하는지 확인
                    contains_bonus = 1.0
                    try:
                        boundary = self.boundary_gdf[self.boundary_gdf['adm_cd'] == adm_cd].iloc[0]
                        if boundary['geometry'].contains(Point(grid_lng, grid_lat)):
                            contains_bonus = 5.0  # 포함되면 가중치 5배로 증가
                    except:
                        pass
                    
                    weight *= contains_bonus
                    
                    # 인구수와 가중치 적용
                    population = self.population_df.loc[adm_cd, time_col]
                    total_weighted_pop += population * weight
                    total_weight += weight
                
                # 가중 평균으로 최종 인구 계산
                if total_weight > 0:
                    final_population = total_weighted_pop / total_weight
                else:
                    final_population = 0
                    
                grid_populations[str(grid_id)] = max(0, final_population)
            
            self.grid_data[time_col] = grid_populations
            
        print(f"   ✅ {len(time_columns)} 개 시간대 처리 완료")
        print(f"   📊 처리된 그리드: {len(self.grid_points)} 개 (서울 내부만)")
        """각 그리드 포인트의 인구값 계산"""
        print("🧮 그리드별 인구 데이터 계산 중...")
        
        # 행정동 중심점 계산
        centroids = {}
        for idx, row in self.boundary_gdf.iterrows():
            adm_cd = str(row['adm_cd'])
            centroid = row['geometry'].centroid
            centroids[adm_cd] = (centroid.x, centroid.y)
        
        # 각 시간대별로 처리
        time_columns = list(self.population_df.columns)
        
        for time_col in tqdm(time_columns, desc="시간대 처리"):
            grid_populations = {}
            
            for grid_idx, grid_row in self.grid_points.iterrows():
                grid_lng = grid_row['lng']
                grid_lat = grid_row['lat']
                grid_id = grid_row['grid_id']
                
                total_weighted_pop = 0
                total_weight = 0
                
                # 각 행정동으로부터의 영향 계산
                for adm_cd, (center_lng, center_lat) in centroids.items():
                    if adm_cd not in self.population_df.index:
                        continue
                        
                    # 거리 계산 (대략적인 미터 단위)
                    distance = self._calculate_distance(
                        grid_lng, grid_lat, center_lng, center_lat
                    )
                    
                    # 가우시안 가중치 계산 (거리가 멀수록 영향 감소)
                    weight = np.exp(-(distance ** 2) / (2 * (self.smooth_factor * 1000) ** 2))
                    
                    # 해당 행정동이 그리드 포인트를 포함하는지 확인
                    contains_bonus = 1.0
                    try:
                        boundary = self.boundary_gdf[self.boundary_gdf['adm_cd'] == adm_cd].iloc[0]
                        if boundary['geometry'].contains(Point(grid_lng, grid_lat)):
                            contains_bonus = 3.0  # 포함되면 가중치 3배
                    except:
                        pass
                    
                    weight *= contains_bonus
                    
                    # 인구수와 가중치 적용
                    population = self.population_df.loc[adm_cd, time_col]
                    total_weighted_pop += population * weight
                    total_weight += weight
                
                # 가중 평균으로 최종 인구 계산
                if total_weight > 0:
                    final_population = total_weighted_pop / total_weight
                else:
                    final_population = 0
                    
                grid_populations[str(grid_id)] = max(0, final_population)
            
            self.grid_data[time_col] = grid_populations
            
        print(f"   ✅ {len(time_columns)} 개 시간대 처리 완료")
        
    def _calculate_distance(self, lng1, lat1, lng2, lat2):
        """두 좌표 간의 거리 계산 (미터 단위)"""
        from math import radians, cos, sin, asin, sqrt
        
        # Haversine formula
        lng1, lat1, lng2, lat2 = map(radians, [lng1, lat1, lng2, lat2])
        dlng = lng2 - lng1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371000  # 지구 반지름 (미터)
        return c * r
        
    def save_results(self, output_dir="./processed_data"):
        """결과 저장"""
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        print("💾 결과 저장 중...")
        
        # 그리드 좌표 저장
        coords_file = os.path.join(output_dir, "grid_coordinates.json")
        with open(coords_file, 'w', encoding='utf-8') as f:
            json.dump(self.grid_coords, f, ensure_ascii=False, indent=2)
        print(f"   ✅ 그리드 좌표: {coords_file}")
        
        # 인구 데이터 저장
        population_file = os.path.join(output_dir, "grid_population.json")
        with open(population_file, 'w', encoding='utf-8') as f:
            json.dump(self.grid_data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ 인구 데이터: {population_file}")
        
        # 메타데이터 저장
        metadata = {
            "grid_size": self.grid_size,
            "smooth_factor": self.smooth_factor,
            "total_grids": len(self.grid_coords),
            "time_periods": list(self.grid_data.keys()),
            "bounds": self.boundary_gdf.total_bounds.tolist(),
            "description": "서울 유동인구 그리드 데이터"
        }
        
        meta_file = os.path.join(output_dir, "metadata.json")
        with open(meta_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        print(f"   ✅ 메타데이터: {meta_file}")
        
        # 샘플 통계 출력
        if self.grid_data:
            sample_time = list(self.grid_data.keys())[0]
            sample_values = list(self.grid_data[sample_time].values())
            print(f"\n📊 데이터 통계 ({sample_time}):")
            print(f"   최소값: {min(sample_values):.1f}")
            print(f"   최대값: {max(sample_values):.1f}")
            print(f"   평균값: {np.mean(sample_values):.1f}")
            print(f"   0이 아닌 셀: {len([v for v in sample_values if v > 0])}/{len(sample_values)}")
            
            # 데이터 밀도 확인
            nonzero_ratio = len([v for v in sample_values if v > 0]) / len(sample_values)
            print(f"   데이터 밀도: {nonzero_ratio * 100:.1f}% (유효 그리드 비율)")

def main():
    """메인 실행 함수"""
    print("🏙️ 서울 유동인구 그리드 전처리 시작!")
    print("=" * 50)
    
    # 프로세서 초기화
    processor = SeoulGridProcessor(
        grid_size=80,  # 80x80 그리드 (6400개 셀)
        smooth_factor=0.5  # 적당한 스무딩
    )
    
    # 데이터 로드
    processor.load_data(
        geojson_path="./data/bdry.geojson",
        csv_path="./data/sample.csv"
    )
    
    # 그리드 생성
    processor.create_grid()
    
    # 서울 경계 내부 그리드만 필터링
    processor.filter_grids_in_seoul()
    
    # 인구 데이터 계산
    processor.calculate_grid_population()
    
    # 결과 저장
    processor.save_results()
    
    print("\n🎉 전처리 완료!")
    print("결과 파일들:")
    print("  - ./processed_data/grid_coordinates_5.json")
    print("  - ./processed_data/grid_population_5.json")
    print("  - ./processed_data/metadata_5.json")

if __name__ == "__main__":
    main()