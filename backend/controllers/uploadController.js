const cloudinary = require('../config/cloudinary');
const axios = require('axios');

function uploadBufferToCloudinary(buffer, folder = 'edge-images', resource_type = 'image') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function proxyDriverImage(req, res) {
  try {
    const publicId = req.params.publicId;
    if (!publicId) return res.status(400).json({ error: 'publicId required' });
    // Get resource info from Cloudinary
    let resource;
    try {
      resource = await cloudinary.api.resource(publicId);
    } catch (err) {
      console.error('Cloudinary resource fetch failed for', publicId, err);
      return res.status(502).json({ error: 'Failed to fetch resource from Cloudinary', detail: err.message });
    }
    const url = resource.secure_url || resource.url;
    if (!url) return res.status(404).json({ error: 'Resource URL not found' });
    const resp = await axios.get(url, { responseType: 'stream', timeout: 20000 });
    res.setHeader('content-type', resp.headers['content-type'] || 'application/octet-stream');
    resp.data.pipe(res);
  } catch (err) {
    console.error('proxyDriverImage error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { uploadBufferToCloudinary, proxyDriverImage };
