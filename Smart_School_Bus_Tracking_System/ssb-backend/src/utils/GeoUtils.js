/**
 * GeoUtils - Utility functions for geographic calculations
 * Hỗ trợ tính khoảng cách, point-to-polyline distance, etc.
 */

class GeoUtils {
  /**
   * Tính khoảng cách giữa 2 điểm (Haversine formula)
   * @param {number} lat1 - Latitude điểm 1
   * @param {number} lng1 - Longitude điểm 1
   * @param {number} lat2 - Latitude điểm 2
   * @param {number} lng2 - Longitude điểm 2
   * @returns {number} Khoảng cách tính bằng km
   */
  static distanceBetweenPoints(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Decode polyline string (Google encoded polyline) thành mảng points
   * @param {string} encoded - Encoded polyline string
   * @returns {Array<{lat: number, lng: number}>} Mảng các điểm
   */
  static decodePolyline(encoded) {
    if (!encoded || typeof encoded !== 'string') {
      return [];
    }

    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
    }

    return poly;
  }

  /**
   * Tính khoảng cách tối thiểu từ một điểm đến polyline
   * Sử dụng projection lên từng đoạn của polyline
   * @param {number} pointLat - Latitude của điểm
   * @param {number} pointLng - Longitude của điểm
   * @param {Array<{lat: number, lng: number}>} polylinePoints - Mảng các điểm của polyline
   * @returns {number} Khoảng cách tối thiểu tính bằng km
   */
  static minDistancePointToPolyline(pointLat, pointLng, polylinePoints) {
    if (!polylinePoints || polylinePoints.length === 0) {
      return Infinity;
    }

    if (polylinePoints.length === 1) {
      return this.distanceBetweenPoints(
        pointLat,
        pointLng,
        polylinePoints[0].lat,
        polylinePoints[0].lng
      );
    }

    let minDistance = Infinity;

    // Lặp qua từng đoạn [Pi, Pi+1] của polyline
    for (let i = 0; i < polylinePoints.length - 1; i++) {
      const p1 = polylinePoints[i];
      const p2 = polylinePoints[i + 1];

      // Tính khoảng cách từ point đến đoạn thẳng p1-p2
      const distance = this.distancePointToSegment(
        pointLat,
        pointLng,
        p1.lat,
        p1.lng,
        p2.lat,
        p2.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Tính khoảng cách từ một điểm đến một đoạn thẳng (line segment)
   * Sử dụng projection của điểm lên đoạn thẳng
   * @param {number} px - Latitude của điểm
   * @param {number} py - Longitude của điểm
   * @param {number} x1 - Latitude của điểm đầu đoạn
   * @param {number} y1 - Longitude của điểm đầu đoạn
   * @param {number} x2 - Latitude của điểm cuối đoạn
   * @param {number} y2 - Longitude của điểm cuối đoạn
   * @returns {number} Khoảng cách tính bằng km
   */
  static distancePointToSegment(px, py, x1, y1, x2, y2) {
    // Chuyển đổi sang hệ tọa độ Cartesian (approximate cho khoảng cách ngắn)
    // Sử dụng công thức projection trên mặt cầu

    // Vector từ p1 đến p2
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Vector từ p1 đến point
    const dpx = px - x1;
    const dpy = py - y1;

    // Tính dot product
    const dot = dpx * dx + dpy * dy;
    const lenSq = dx * dx + dy * dy;

    // Nếu đoạn thẳng có độ dài = 0, trả về khoảng cách đến điểm đầu
    if (lenSq === 0) {
      return this.distanceBetweenPoints(px, py, x1, y1);
    }

    // Tính parameter t (từ 0 đến 1)
    const t = Math.max(0, Math.min(1, dot / lenSq));

    // Tìm điểm gần nhất trên đoạn thẳng
    const closestLat = x1 + t * dx;
    const closestLng = y1 + t * dy;

    // Tính khoảng cách từ point đến điểm gần nhất
    return this.distanceBetweenPoints(px, py, closestLat, closestLng);
  }

  /**
   * Kiểm tra điểm có nằm trong bán kính của một điểm khác không
   * @param {number} pointLat - Latitude của điểm cần kiểm tra
   * @param {number} pointLng - Longitude của điểm cần kiểm tra
   * @param {number} centerLat - Latitude của tâm
   * @param {number} centerLng - Longitude của tâm
   * @param {number} radiusKm - Bán kính tính bằng km
   * @returns {boolean} true nếu điểm nằm trong bán kính
   */
  static isPointInRadius(pointLat, pointLng, centerLat, centerLng, radiusKm) {
    const distance = this.distanceBetweenPoints(
      pointLat,
      pointLng,
      centerLat,
      centerLng
    );
    return distance <= radiusKm;
  }
}

export default GeoUtils;

