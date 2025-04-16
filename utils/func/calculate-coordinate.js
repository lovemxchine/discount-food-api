// const R = 6371; // Earth radius in km

const calculateCoordinate = (lat, lng, distanceInKm) => {
  const latDelta = distanceInKm / 111.32;
  const lonDelta = distanceInKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lng - lonDelta,
    maxLon: lng + lonDelta,
  };
};

module.exports = calculateCoordinate;
