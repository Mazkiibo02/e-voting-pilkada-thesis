export function runKMeansTPS(data: any[], k: number = 2) {
  let centroids = data.slice(0, k).map(d => [
    d.turnout / d.registered,
    d.candidate1Votes / d.turnout
  ]);

  let iterations = 10;

  while (iterations--) {
    data.forEach(d => {
      const point = [
        d.turnout / d.registered,
        d.candidate1Votes / d.turnout
      ];

      const distances = centroids.map(c =>
        Math.sqrt(
          (point[0] - c[0]) ** 2 +
          (point[1] - c[1]) ** 2
        )
      );

      d.cluster = distances.indexOf(Math.min(...distances));
    });

    centroids = centroids.map((_, i) => {
      const clusterPoints = data.filter(d => d.cluster === i);
      if (clusterPoints.length === 0) return centroids[i];

      const avgTurnout =
        clusterPoints.reduce((sum, d) => sum + d.turnout / d.registered, 0) /
        clusterPoints.length;

      const avgRatio =
        clusterPoints.reduce((sum, d) => sum + d.candidate1Votes / d.turnout, 0) /
        clusterPoints.length;

      return [avgTurnout, avgRatio];
    });
  }

  const clusterCounts: any = {};
  data.forEach(d => {
    clusterCounts[d.cluster] = (clusterCounts[d.cluster] || 0) + 1;
  });

  const anomalyCluster = Object.entries(clusterCounts)
    .sort((a: any, b: any) => a[1] - b[1])[0][0];

  return data.map(d => ({
    ...d,
    anomaly: d.cluster == anomalyCluster
  }));
}