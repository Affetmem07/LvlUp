module.exports = (req, res) => {
  res.status(200).json({
    RAWG_API_KEY: process.env.RAWG_API_KEY,
    ITAD_API_KEY: process.env.ITAD_API_KEY,
  });
};
