module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "x-real-ip",
            value: "{req: ip}",
          },
        ],
      },
    ];
  },
};
