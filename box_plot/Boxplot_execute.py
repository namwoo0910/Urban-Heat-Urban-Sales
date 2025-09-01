import numpy as np
import plotly.graph_objects as go

def plot_norm_box(df, category_name, category_column):
    sub = df[df[category_column] == category_name]
    if sub.empty:
        print(f"'{category_column}'에서 '{category_name}'을(를) 찾지 못했습니다.")
        return
    row = sub.iloc[0]

    base = float(row["온화_median"])
    pre_normalized = np.isfinite(base) and (90 <= base <= 110)
    factor = 1.0 if pre_normalized else (100.0 / base if np.isfinite(base) and base != 0 else 1.0)

    # ✅ 좌표용 키(문자열)과 표시 라벨 분리
    conditions = ["한파", "온화", "폭염"]  # x 좌표는 항상 이 문자열
    label_map  = {"한파":"Cold (한파)", "온화":"Normal (온화)", "폭염":"Hot (폭염)"}
    colors     = {"한파":"#3498db", "온화":"#2ecc71", "폭염":"#e74c3c"}

    fig = go.Figure()
    meds, q3s, all_vals = [], [], []

    for cond in conditions:
        q1 = float(row[f"{cond}_Q1"]) * factor
        md = float(row[f"{cond}_median"]) * factor
        q3 = float(row[f"{cond}_Q3"]) * factor
        lw = float(row[f"{cond}_lower_whisker"]) * factor
        uw = float(row[f"{cond}_upper_whisker"]) * factor

        meds.append(md); q3s.append(q3); all_vals.extend([lw, uw])

        # ✅ 박스의 x도 문자열 키(cond)로
        fig.add_trace(go.Box(
            name=label_map[cond],
            x=[cond],
            q1=[q1], median=[md], q3=[q3],
            lowerfence=[lw], upperfence=[uw],
            marker_color=colors[cond],
            boxpoints=False,
            showlegend=False
        ))

    # ✅ 중앙값 선: x를 동일 문자열 키로, NaN 건너뛰기
    fig.add_trace(go.Scatter(
        x=conditions,
        y=meds,
        mode="lines+markers",
        connectgaps=True,
        line=dict(width=2),
        marker=dict(size=8),
        hoverinfo="skip",
        showlegend=False
    ))

    # 축/레이아웃
    annotation_y = (np.nanmax(q3s) if len(q3s) else 100) * 1.05
    ymin = np.nanmin(all_vals) if all_vals else 80

    fig.update_layout(
        template="plotly_dark",
        title=dict(text=f'Normalized Sales Distribution for "{category_name}"',
                   y=0.9, x=0.5, xanchor="center", yanchor="top", font=dict(size=20)),
        yaxis_title="Sales Index (Normal Weather Median = 100%)",
        xaxis_title="Weather Condition",
        boxmode="overlay",
        width=900, height=600,
        shapes=[dict(type="line", y0=100, y1=100, x0=-0.5, x1=2.5, line=dict(width=2, dash="dash"))]
    )

    # ✅ 문자열 카테고리 축 정렬/라벨 고정
    fig.update_xaxes(
        type="category",
        categoryorder="array",
        categoryarray=conditions,            # 이 순서로 고정
        tickvals=conditions,                 # 눈금 위치는 키
        ticktext=[label_map[c] for c in conditions]  # 눈금 표시는 라벨
    )
    fig.update_yaxes(range=[ymin * 0.95, annotation_y * 1.25])

    fig.show()
# 실행    
# # 1) 업종 기준
# plot_norm_box(df_norm_clean, category_name="패션/잡화", category_column="업종")

# # 2) 행정동 × 생활인구  (행 키가 '행정동'인 DF)
# plot_norm_box(df_norm2, category_name="가락1동", category_column="행정동")

# # 3) 행정동 × 업종  (키가 '행정동_업종'인 DF, 값은 '가락1동_약국' 등)
# plot_norm_box(df_norm3_enriched, category_name="가락1동_약국", category_column="행정동_업종")