const fetch = require("node-fetch");
const crypto = require("crypto");
const { Buffer } = require("buffer");

class EaseMate {
  constructor() {
    this.API_URL_BASE = "https://www.easemate.ai/webapp/chat?from=ai-chat";
    this.AUTH_URL_BASE = "https://www.easemate.ai/lh-account-api";
    this.MAIL_API = `https://api.mail7.io/api/v2`;
    this.DEVICE_UUID = crypto.randomBytes(16).toString("hex");
    this.LOCATION_HOST = "www.easemate.ai";
    this.BROWSER_PLATFORM = "Android,Chrome";
    this.LANG = "en";
    this.LANGUAGE = "en-US";
    this.MODEL_ID = 7;
  }

  _md5(data) {
    return crypto.createHash("md5").update(data).digest("hex");
  }

  _getTimestamp() {
    return Math.round(new Date().getTime() / 1e3);
  }

  _jsonParse(e) {
    try {
      return JSON.parse(e);
    } catch (err) {
      console.error("❌ Gagal mem-parsing JSON:", err.message);
      return null;
    }
  }

  _sortParams(e) {
    return Object.keys(e).sort().reduce((r, o) => {
      const i = e[o];
      if (Array.isArray(i)) {
        r[o] = i.map(a => typeof a == "object" && a !== null ? this._sortParams(a) : a);
      } else if (typeof i == "object" && i !== null) {
        r[o] = this._sortParams(i);
      } else {
        r[o] = i;
      }
      return r;
    }, {});
  }

  _serializeQuery(e) {
    const r = [];

    function i(a, n) {
      if (n != null) {
        if (Array.isArray(n)) {
          n.forEach((s, l) => {
            i(`${a}[${l}]`, s);
          });
        } else if (typeof n == "object") {
          for (const [s, l] of Object.entries(n)) {
            i(`${a}[${s}]`, l);
          }
        } else {
          r.push(`${a}=${String(n)}`);
        }
      }
    }
    for (const [a, n] of Object.entries(e)) {
      i(a, n);
    }
    return r.join("&");
  }

  _getSigns(body) {
    try {
      const r = this._getTimestamp();
      const o = "TB";
      const i = this.DEVICE_UUID;
      let a;
      let n = body;
      if (n && typeof n === "string" && n.includes("{") && n.includes("}")) {
        n = this._jsonParse(n);
      }
      if (n && Object.keys(n).length) {
        const s = this._sortParams(n);
        s.appKey = o;
        s.timestamp = r;
        a = `${i}${this._serializeQuery(s)}${i}`;
      } else {
        a = `${i}&appKey=${o}&timestamp=${r}${i}`;
      }
      return {
        sign: this._md5(a),
        timestamp: `${r}`
      };
    } catch (error) {
      console.error("❌ Gagal membuat tanda tangan API:", error.message);
      throw error;
    }
  }

  async _apiCall(path, method, body, s3Upload = false, isStream = false, isAuth = false, token = null) {
    const baseUrl = isAuth ? this.AUTH_URL_BASE : s3Upload ? "" : this.API_URL_BASE;
    const url = s3Upload ? path : `${baseUrl}${path}`;
    try {
      let headers = {};
      if (!s3Upload && !path.startsWith(this.MAIL_API)) {
        const {
          sign,
          timestamp
        } = this._getSigns(body);
        headers = {
          ...headers,
          "client-name": "chatpdf",
          "client-type": "web",
          "device-identifier": this.DEVICE_UUID,
          "device-platform": this.BROWSER_PLATFORM,
          "device-type": "web",
          "device-uuid": this.DEVICE_UUID,
          lang: this.LANG,
          language: this.LANGUAGE,
          site: this.LOCATION_HOST,
          sign: sign,
          timestamp: timestamp
        };
        if (token) {
          headers.authorization = `Bearer ${token}`;
        }
      }
      headers = {
        ...headers,
        "Accept-Language": "id-ID,id;q=0.9",
        Connection: "keep-alive",
        Origin: "https://www.easemate.ai",
        Referer: "https://www.easemate.ai/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        accept: "application/json"
      };
      if (isStream) {
        headers.accept = "text/event-stream, text/event-stream";
        headers["Cache-Control"] = "no-cache";
      }
      let requestBody = body ? JSON.stringify(body) : undefined;
      if (s3Upload) {
        headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          "Content-Type": "image/jpeg",
          Origin: "https://www.easemate.ai",
          Referer: "https://www.easemate.ai/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        };
        requestBody = body;
      } else if (body) {
        headers["content-type"] = "application/json;charset=UTF-8";
      }
      console.log(`📡 Memanggil API: ${method} ${url}`);
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: requestBody
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Permintaan gagal: ${response.status} ${response.statusText} - ${errorText}`);
      }
      console.log(`✅ Panggilan API berhasil: ${method} ${url}`);
      if (s3Upload) {
        return {
          message: "Upload berhasil"
        };
      }
      if (isStream) {
        const fullResponseText = await response.text();
        let fullAnswer = "";
        const lines = fullResponseText.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonString = line.slice("data:".length).trim();
            try {
              const data = JSON.parse(jsonString);
              const answerPart = this._jsonParse(data.data).answer;
              fullAnswer += answerPart;
            } catch (e) {
              console.error("❌ Gagal mem-parsing JSON dari stream:", e.message);
            }
          }
        }
        return fullAnswer.trim();
      }
      const data = await response.json();
      if (!s3Upload && !path.startsWith(this.MAIL_API) && data.code !== 200) {
        throw new Error(`API Error: ${data.message} (Code: ${data.code})`);
      }
      return data.data;
    } catch (error) {
      console.error(`❌ Terjadi kesalahan dalam panggilan API ke ${url}:`, error.message);
      throw error;
    }
  }

  async chat({
    imageUrl = null,
    prompt = "Describe this picture",
    ...rest
  }) {
    try {
      console.log("🚀 Memulai proses chat...");
      const createSessionPayload = {
        model_id: this.MODEL_ID,
        ...rest
      };
      const sessionResponse = await this._apiCall("/task/create_pure_session", "POST", createSessionPayload);
      const {
        session_id
      } = sessionResponse;
      console.log(`ℹ️ Sesi chat dibuat dengan ID: ${session_id}`);
      
      const objectInfo = [];
      if (imageUrl) {
        console.log("📷 Processing image...");
        
        // Check if imageUrl is a data URL (base64)
        if (imageUrl.startsWith('data:')) {
          // Convert base64 to buffer
          const base64Data = imageUrl.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Upload to S3
          const timestamp = new Date().getTime();
          const uniqueId = crypto.randomBytes(16).toString("hex");
          const s3Name = `${uniqueId}_${timestamp}.jpg`;
          const s3Path = `pro/${this.DEVICE_UUID}/${s3Name}`;
          const uploadUrlPayload = {
            key: s3Path,
            value: s3Name
          };
          const uploadResponse = await this._apiCall("/task/query_upload_url", "POST", uploadUrlPayload);
          const {
            upload_url,
            download_url
          } = uploadResponse;
          
          await this._apiCall(upload_url, "PUT", imageBuffer, true);
          console.log(`✅ Gambar berhasil diunggah ke S3: ${download_url}`);
          
          objectInfo.push({
            img_info: {
              s3_name: s3Name,
              s3_url: download_url,
              size: imageBuffer.length,
              origin_name: "input_image.jpg"
            }
          });
        } else {
          // If it's already a URL, try to fetch and upload
          const timestamp = new Date().getTime();
          const uniqueId = crypto.randomBytes(16).toString("hex");
          const s3Name = `${uniqueId}_${timestamp}.jpg`;
          const s3Path = `pro/${this.DEVICE_UUID}/${s3Name}`;
          const uploadUrlPayload = {
            key: s3Path,
            value: s3Name
          };
          const uploadResponse = await this._apiCall("/task/query_upload_url", "POST", uploadUrlPayload);
          const {
            upload_url,
            download_url
          } = uploadResponse;
          
          const imageFetchResponse = await fetch(imageUrl);
          if (!imageFetchResponse.ok) {
            throw new Error(`Gagal mengambil gambar dari URL: ${imageUrl}`);
          }
          const imageArrayBuffer = await imageFetchResponse.arrayBuffer();
          const imageBuffer = Buffer.from(imageArrayBuffer);
          
          await this._apiCall(upload_url, "PUT", imageBuffer, true);
          console.log(`✅ Gambar berhasil diunggah ke S3: ${download_url}`);
          
          objectInfo.push({
            img_info: {
              s3_name: s3Name,
              s3_url: download_url,
              size: imageBuffer.length,
              origin_name: "input_image.jpg"
            }
          });
        }
      } else {
        console.log("ℹ️ Tidak ada URL gambar yang disediakan, melewati langkah unggah gambar.");
      }
      
      console.log("💬 Mengirim permintaan chat...");
      const execOperationPayload = {
        model_id: this.MODEL_ID,
        session_id: session_id,
        operation_info: {
          operation: prompt,
          id: 1e4
        },
        object_info: objectInfo,
        ...rest
      };
      const fullAnswer = await this._apiCall("/stream/exec_operation", "POST", execOperationPayload, false, true);
      console.log("✅ Permintaan chat selesai.");
      return fullAnswer;
    } catch (error) {
      console.error("❌ Terjadi kesalahan pada fungsi chat:", error.message);
      throw error;
    }
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const ai = new EaseMate();

  if (!action) {
    console.error("⛔️ Parameter 'action' tidak ditemukan.");
    return res.status(400).json({
      error: "Parameter 'action' diperlukan."
    });
  }

  try {
    switch (action) {
      case "chat": {
        console.log("➡️ Menerima permintaan 'chat'.");
        if (!params.prompt) {
          console.error("⛔️ Parameter 'prompt' harus ada untuk aksi 'chat'.");
          return res.status(400).json({
            error: "Parameter 'prompt' harus ada untuk aksi 'chat'."
          });
        }
        const answer = await ai.chat(params);
        console.log("✅ Mengirimkan respons 'chat' berhasil.");
        return res.status(200).json({
          answer: answer
        });
      }
      default:
        console.error("⛔️ Aksi tidak valid:", action);
        return res.status(400).json({
          error: `Aksi tidak valid. Aksi yang didukung: 'chat'.`
        });
    }
  } catch (error) {
    console.error("❌ Kesalahan pada handler API:", error);
    res.status(500).json({
      error: error.message || "Kesalahan Server Internal."
    });
  }
}
