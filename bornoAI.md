চলো borno AI এর পেজ বানানো যাক, ঠিক AI Assistant এর মত।
আমি রেন্ডার এ js রেখেছি,

https://hmtutoring-backend.onrender.com/api/bornoai
const express = require("express");
const https = require("https");

const router = express.Router();

router.post("/", (req, res) => {
  const url = "https://www.borno.io/nanoid";

  const options = {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,it-IT;q=0.7,it;q=0.6",
      "content-type": "text/plain;charset=UTF-8",
      dnt: "1",
      "next-action": "7c6e0a6f33088a815e37d3d628d21acf91b429e87d",
      "next-router-state-tree":
        '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22id%22%2C%22h3h14effd%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fh3h14effd%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
      origin: "https://www.borno.io",
      priority: "u=1, i",
      referer: "https://www.borno.io/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/140.0.0.0",
      "x-deployment-id": "dpl_2d9KvmgRw46pvEsbB3ruPaes4YDM",
    },
  };

  // expected body:
  // [
  //   "প্রশ্ন",
  //   "ছবি base64",
  //   "fvRLQNCpxUVIGeqCn45iW59CIzD3",
  //   "একাদশ-শ্রেণী",
  //   "পদার্থবিজ্ঞান প্রথম পত্র"
  // ]
  const data = JSON.stringify(req.body);

  let result = "";
  const request = https.request(url, options, (response) => {
    response.setEncoding("utf8");

    response.on("data", (chunk) => {
      result += chunk;
    });

    response.on("end", () => {
      res.status(response.statusCode).send(result);
    });
  });

  request.on("error", (err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  request.write(data);
  request.end();
});

module.exports = router;


শ্রেণির জায়গায় প্রথম শ্রেণী থেকে দ্বাদশ শ্রেণী থাকবে যা ড্রপডাউন মেনু থেকে সিলেক্ট করতে পারবে।
বিষয়ের জায়গায় যে শ্রেণি সিলেক্ট করা হবে সেই শ্রেণির সকল বিষয় ড্রপডাউন মেনু থেকে সিলেক্ট করতে পারবে। যা হবে বাংলাদেশের সিলেবাস অনুযায়ী। NCTB অনুযায়ী।
যেমন: একাদশ শ্রেণীর জন্য থাকবে:
পদার্থবিজ্ঞান প্রথম পত্র
পদার্থবিজ্ঞান দ্বিতীয় পত্র
রসায়ন প্রথম পত্র
রসায়ন দ্বিতীয় পত্র
জীববিজ্ঞান প্রথম পত্র
জীববিজ্ঞান দ্বিতীয় পত্র
উচ্চতর গণিত প্রথম পত্র
উচ্চতর গণিত দ্বিতীয় পত্র
বাংলা প্রথম পত্র
বাংলা দ্বিতীয় পত্র
ইংরেজি প্রথম পত্র
ইংরেজি দ্বিতীয় পত্র
তথ্য ও যোগাযোগ প্রযুক্তি

ঠিক AI Assistant এর মত একটা পেজ বানাতে হবে। যেখানে ছবি আপলোড করার অপশন থাকবে এবং প্রশ্ন করার অপশন থাকবে।

