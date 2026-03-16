const fs = require('fs');
let index = fs.readFileSync('index.js', 'utf8');
index = "const cors = require('cors');\n" + index.replace("app.use(express.json());", "app.use(express.json());\napp.use(cors());");
fs.writeFileSync('index.js', index);
