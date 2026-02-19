import streamlit as st
import folium
from streamlit_folium import st_folium
from streamlit_js_eval import streamlit_js_eval
import math

# --- 1. DATA ---
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5,  "std_off": 1.2}
}

st.set_page_config(page_title="Takomo Live Caddie", layout="wide")

# Helper for Distance
def get_dist(lat1, lon1, lat2, lon2):
    R = 6371000 
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)) * R) * 1.09361

# --- 2. CONTINUOUS GPS PING ---
# We use a high-frequency key to keep the GPS active
loc = streamlit_js_eval(data_key='gps', func_name='getCurrentPosition', component_value=None)

if loc:
    user_pos = [loc['coords']['latitude'], loc['coords']['longitude']]
    st.sidebar.success("📡 GPS Active")
else:
    user_pos = [36.5662, -121.9465] # Default
    st.sidebar.warning("Searching for GPS...")

# --- 3. TARGETING & CLUB ---
if 'target' not in st.session_state:
    st.session_state.target = [user_pos[0] + 0.0005, user_pos[1]]

club = st.selectbox("Select Club", list(stats.keys()))
s = stats[club]

# Display Distance
current_dist = get_dist(user_pos[0], user_pos[1], st.session_state.target[0], st.session_state.target[1])
st.metric(label="Distance to Aim Point", value=f"{int(current_dist)} yards")

# --- 4. THE LIVE MAP ---
# Zoom logic: pull back if we're far away, dive in if we're close
zoom_level = 19 if current_dist < 220 else 17

m = folium.Map(location=st.session_state.target, zoom_start=zoom_level, tiles=None)
folium.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
                 attr='Esri', name='Satellite').add_to(m)

# Markers
folium.CircleMarker(user_pos, radius=8, color='blue', fill=True, popup="Ball").add_to(m)
folium.Marker(st.session_state.target, icon=folium.Icon(color='red', icon='flag')).add_to(m)
folium.PolyLine([user_pos, st.session_state.target], color="white", weight=1, dash_array='5, 10').add_to(m)

# Dispersion
bias_lon = st.session_state.target[1] + (s['avg_off'] * 0.000009)
def get_ell(lat, lon, sc, so, sig):
    pts = []
    la_s, lo_s = 0.000009, 0.000009 / math.cos(math.radians(lat))
    for i in range(0, 361, 20):
        a = math.radians(i)
        pts.append([lat + math.sin(a)*sc*sig*la_s, lon + math.cos(a)*so*sig*lo_s])
    return pts

folium.Polygon(get_ell(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 2), color="yellow", fill=True, fill_opacity=0.1).add_to(m)
folium.Polygon(get_ell(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 1), color="red", fill=True, fill_opacity=0.3).add_to(m)

map_data = st_folium(m, width=700, height=500, key="golf_map")

if map_data and map_data['last_clicked']:
    st.session_state.target = [map_data['last_clicked']['lat'], map_data['last_clicked']['lng']]
    st.rerun()
