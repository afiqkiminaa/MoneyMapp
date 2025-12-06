const functions = require("firebase-functions");
const vision = require("@google-cloud/vision");
const cors = require("cors")({ origin: true });

const client = new vision.ImageAnnotatorClient();

exports.extractText = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { image } = req.body;

      const [result] = await client.textDetection({
        image: { content: image },
      });

      const detections = result.textAnnotations;
      const text = detections.length > 0 ? detections[0].description : "";

      res.json({ text });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});
