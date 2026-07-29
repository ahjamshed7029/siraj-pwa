export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    // сюда переносится ваш код Groq
    res.status(200).json({
      text: "OK",
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
}