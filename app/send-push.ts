// send-push.ts

async function send(to: string, title: string, body: string, data: any = {}) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      to,
      sound: "default",         // or omit; Android channel chooses your wav
      title,
      body,
      data,                     // e.g. { chatId, partnerId, senderName }
      priority: "high"
    }),
  });
  console.log(await res.json());
}

// put an ExponentPushToken[...] here to test:
send("ExponentPushToken[XXXXXXXXXXXXXX]", "New message", "Hey there!", { chatId: "abc" });
