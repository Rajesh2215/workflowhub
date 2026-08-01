const net = require("net");

const rabbitmqUrl = process.env.RABBITMQ_URL;

if (!rabbitmqUrl) {
  console.error("RABBITMQ_URL is missing");
  process.exit(1);
}

let url;

try {
  url = new URL(rabbitmqUrl);
} catch (error) {
  console.error("RABBITMQ_URL is invalid");
  process.exit(1);
}

const socket = net.connect(Number(url.port) || 5672, url.hostname, () => {
  socket.end();
  process.exit(0);
});

socket.on("error", () => process.exit(1));
socket.setTimeout(2000, () => {
  socket.destroy();
  process.exit(1);
});