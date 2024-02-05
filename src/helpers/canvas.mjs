/** @override */
export const measureDistances = function(segments, options={}) {

  const d = canvas.dimensions;

  return segments.map(s => {
    let r = s.ray;

    let nx = Math.abs(Math.ceil(r.dx / d.size));
    let ny = Math.abs(Math.ceil(r.dy / d.size));

    return (nx + ny) * canvas.scene.data.gridDistance;
  });
};
