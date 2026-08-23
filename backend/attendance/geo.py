from math import radians, sin, cos, sqrt, atan2

EARTH_RADIUS_METERS = 6371000


def distance_meters(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(lambda v: radians(float(v)), (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return EARTH_RADIUS_METERS * c
