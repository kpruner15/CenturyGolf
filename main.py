import streamlit as st
import plotly.graph_objects as go
import pandas as pd
import math

# --- 1. THE PERMANENT CENTURYGOLF BAG ---
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

MAPBOX_TOKEN = "pk.eyJ1Ijoia3BydW5lcjE1IiwiYSI6ImNtbHRtcmZqdjAxdmEzZG9rN3BoOHQ3angifQ.sRKt7mL9MLg8gyuLNqPvWQ"

st.set_page_config(page_title="CenturyGolf Pro", layout="wide")

# --- 2. STATE MANAGEMENT ---
if 'ball' not in st.session_state: st.session_state.ball = [36.5651, -121.9472]
if 'target' not in st.session_state: st.session_state.target = [36.5670, -121.9450]

# --- 3. MATH HELPERS ---
def get_dist(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)) * R) * 1.09361

def get_bearing(lat1, lon1, lat2, lon2):
    d_lon = math.radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(d_lon)
    return (math.degrees(math.atan2(y, x)) + 360) % 360

def get_ellipse_coords(lat, lon, std_c, std_off, sigma):
    lats, lons = [], []
    lat_scale, lon_scale = 0.000009, 0.000009 / math.cos(math.radians(lat))
    for i in range(0, 365, 10):
        a = math.radians(i)
        lats.append(lat + math.sin(a) * (std_c * sigma) * lat_scale)
        lons.append(lon + math.cos(a) * (std_off * sigma) * lon_scale)
    return lats, lons

# --- 4. UI ---
with st.sidebar:
    st.title("🏆 CenturyGolf")
    club = st.selectbox("Select Club", list(stats.keys()))
    s = stats[club]
    tilt = st.slider("3D Tilt", 0, 60, 45)
    st.markdown("---")
    yardage = get_dist(st.session_state.ball[0], st.session_state.ball[1], 
                       st.session_state.target[0], st.session_state.target[1])
    st.metric("Total Yards", f"{int(yardage)}y")

# --- 5. 3D MAP CONSTRUCTION ---
fig = go.Figure()

# Tactical Zones (Ellipses)
bias_lon = st.session_state.target[1] + (s['avg_off'] * 0.000009)
# 95% Confidence (Yellow)
y_lat, y_lon = get_ellipse_coords(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 2)
fig.add_trace(go.Scattermapbox(lat=y_lat, lon=y_lon, fill="toself", fillcolor='rgba(255, 255, 0, 0.2)', 
                               line=dict(width=0), hoverinfo='none', name='95% Range'))
# 68% Confidence (Red)
r_lat, r_lon = get_ellipse_coords(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 1)
fig.add_trace(go.Scattermapbox(lat=r_lat, lon=r_lon, fill="toself", fillcolor='rgba(255, 0, 0, 0.4)', 
                               line=dict(width=0), hoverinfo='none', name='68% Range'))

# Line of Play
fig.add_trace(go.Scattermapbox(
    lat=[st.session_state.ball[0], st.session_state.target[0]],
    lon=[st.session_state.ball[1], st.session_state.target[1]],
    mode='markers+lines',
    marker=dict(size=[10, 15], color=['#3498db', '#e74c3c']),
    line=dict(width=2, color='white', dash='dash')
))

# Perspective
fig.update_layout(
    mapbox=dict(
        accesstoken=MAPBOX_TOKEN,
        style="satellite-streets",
        center=dict(lat=(st.session_state.ball[0] + st.session_state.target[0])/2, 
                    lon=(st.session_state.ball[1] + st.session_state.target[1])/2),
        zoom=17.5,
        bearing=get_bearing(st.session_state.ball[0], st.session_state.ball[1], 
                            st.session_state.target[0], st.session_state.target[1]),
        pitch=tilt
    ),
    margin={"r":0,"t":0,"l":0,"b":0}, height=800, showlegend=False
)

# Render
st.plotly_chart(fig, use_container_width=True)
