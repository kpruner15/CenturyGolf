import streamlit as st
import plotly.graph_objects as go
import math

# --- CENTURYGOLF DATA ---
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "6-Iron": {"avg": 160.2, "std_c": 2.4, "avg_off": 12.5, "std_off": 8.4},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "8-Iron": {"avg": 141.5, "std_c": 2.1, "avg_off": 8.2,  "std_off": 4.1},
    "9-Iron": {"avg": 132.0, "std_c": 1.9, "avg_off": 5.1,  "std_off": 3.2},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "GW": {"avg": 112.5, "std_c": 2.2, "avg_off": 1.5, "std_off": 1.8},
    "SW": {"avg": 101.0, "std_c": 2.5, "avg_off": 0.8, "std_off": 1.5},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5, "std_off": 1.2}
}

TOKEN = "pk.eyJ1Ijoia3BydW5lcjE1IiwiYSI6ImNtbHRtcmZqdjAxdmEzZG9rN3BoOHQ3angifQ.sRKt7mL9MLg8gyuLNqPvWQ"

st.set_page_config(page_title="CenturyGolf Pro", layout="wide")

# --- UI SIDEBAR ---
with st.sidebar:
    st.title("🏆 CenturyGolf")
    club = st.selectbox("Select Club", list(stats.keys()))
    s = stats[club]
    tilt = st.slider("3D Tilt", 0, 60, 45)
    st.divider()
    st.write(f"**Targeting with {club}**")

# --- COORDINATES ---
ball = [36.5651, -121.9472]
target = [36.5670, -121.9450]

# --- THE MAP ENGINE ---
try:
    fig = go.Figure()

    # Add Points
    fig.add_trace(go.Scattermapbox(
        lat=[ball[0], target[0]],
        lon=[ball[1], target[1]],
        mode='markers+lines',
        marker=dict(size=[10, 15], color=['blue', 'red']),
        line=dict(width=2, color='white')
    ))

    # Forced Layout Config
    fig.update_layout(
        hovermode='closest',
        mapbox=dict(
            accesstoken=TOKEN,
            style="mapbox://styles/mapbox/satellite-streets-v12", # <-- Ensure comma here
            bearing=current_bearing,                              # <-- And here
            pitch=tilt,                                          # <-- And here
            zoom=17.5,
            center=dict(lat=ball[0], lon=ball[1])                # No comma needed on last item
        ),
        margin={"r":0,"t":0,"l":0,"b":0},
        height=750
    )

    st.plotly_chart(fig, use_container_width=True)

except Exception as e:
    st.error(f"Map Error: {e}")
    st.write("If you see this, we need to check your 'Requirements.txt' file.")


