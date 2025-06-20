export default function handler(req, res) {
  res.status(403).json({
    error: "Akses ilegal terdeteksi."
  });
}




