import streamlit as st
import plotly.graph_objects as go
import pandas as pd
import math

# --- CENTURYGOLF DATA ---
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5,  "std_off": 1.2}
}

# --- SETTINGS ---
MAPBOX_TOKEN = "PASTE_YOUR_MAPBOX_TOKEN_HERE" # Put your token here!

st.set_page_config(page_title="CenturyGolf Pro", layout="wide")

with st.sidebar:
    st.title("🏆 CenturyGolf")
    club = st.selectbox("Select Club", list(stats.keys()))
    pitch = st.slider("3D Tilt (Pitch)", 0, 60, 45)
    st.info("The map will auto-rotate to face your target.")

# Current "Ball" (Tee) and "Target" (Green)
# For demo, let's put you on the 18th at Pebble Beach
ball_lat, ball_lon = 36.5651, -121.9472 
target_lat, target_lon = 36.5670, -121.9450

# --- ROTATION MATH ---
def get_bearing(lat1, lon1, lat2, lon2):
    d_lon = math.radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(d_lon)
    return math.degrees(math.atan2(y, x))

bearing = get_bearing(ball_lat, ball_lon, target_lat, target_lon)

# --- MAP RENDERING ---
fig = go.Figure()

# 1. Add Ball Position
fig.add_trace(go.Scattermapbox(
    lat=[ball_lat], lon=[ball_lon],
    mode='markers', marker=dict(size=12, color='blue'),
    name='Your Position'
))

# 2. Add Target (Flag)
fig.add_trace(go.Scattermapbox(
    lat=[target_lat], lon=[target_lon],
    mode='markers', marker=dict(size=15, color='red', symbol='marker'),
    name='Aim Point'
))

# 3. Add Aim Line
fig.add_trace(go.Scattermapbox(
    lat=[ball_lat, target_lat],
    lon=[ball_lon, target_lon],
    mode='lines', line=dict(width=2, color='white'),
    hoverinfo='none'
))

# Configure 3D View
fig.update_layout(
    mapbox=dict(
        accesstoken=MAPBOX_TOKEN,
        style="satellite-streets",
        center=dict(lat=(ball_lat + target_lat)/2, lon=(ball_lon + target_lon)/2),
        zoom=16,
        bearing=bearing, # THIS ROTATES THE MAP
        pitch=pitch     # THIS TILTS THE MAP
    ),
    margin={"r":0,"t":0,"l":0,"b":0},
    showlegend=False
)

st.plotly_chart(fig, use_container_width=True)
