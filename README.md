<img width="946" height="405" alt="image" src="https://github.com/user-attachments/assets/7d574f6e-a903-48f0-a807-e19c33cb1141" />

# QRix

**QRix** is a fast, minimal, and responsive QR code generator built using **HTML, CSS, and vanilla JavaScript**.  
It allows users to generate, customize, and download QR codes instantly without any dependencies on frameworks.

---

## Features

- Generate QR codes for:
  - URLs
  - Plain text
  - Phone numbers
  - Email addresses
  - Wi-Fi credentials
- Real-time QR code generation
- Customizable QR color, background and gradient
- Module shapes, corner styles and style presets
- Logo in the center of the code
- Adjustable QR size and error correction
- Download QR codes as **PNG** and **SVG**
- Copy QR code to clipboard
- Responsive layout down to phone width
- Clean and modern UI

---

## Built With

- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- QR Code generation library

---

## Project Structure

```

QRix/
├── frontend/
│   ├── index.html          # Page markup
│   ├── css/                # reset, variables, layout, components, main
│   └── js/
│       ├── app.js          # Entry point, wires the modules together
│       ├── utils.js        # Builds the QR payload for each type
│       ├── form-switcher.js
│       ├── color-picker.js # Colors, gradient and contrast check
│       ├── qr-style.js     # Shapes, presets and logo
│       ├── qr-svg.js       # SVG renderer used for preview and exports
│       └── qr-generator.js # Preview, PNG/SVG download and copy
├── tests/                  # Node tests for the renderer, colors, styles and logo picker,
│                           # qr payloads, the password toggle and the type switcher
└── README.md

```

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/nxthxnael/QRix.git
```

### Run the Project

The page loads its scripts as ES modules, which browsers block over `file://`, so serve the `frontend` folder with any static server:

```bash
cd QRix
python3 -m http.server 8000 --directory frontend
```

Then open http://localhost:8000. No build tools or dependencies required.

### Run the Tests

```bash
node tests/qr-svg.test.mjs
node tests/color-picker.test.mjs
node tests/qr-style.test.mjs
node tests/utils.test.mjs
node tests/form-switcher.test.mjs
node tests/theme.test.mjs
```

---

## Use Cases

- Personal or business QR generation
- Portfolio project for frontend development
- Learning vanilla JavaScript DOM manipulation
- Lightweight QR solution without frameworks

---

## Future Improvements

- Dark mode support
- QR code history using `localStorage`
- Bulk QR generation
- Progressive Web App (PWA) support

---

## Contributing

Contributions are welcome!
Feel free to fork the repo, create a feature branch, and submit a pull request.

---

## License

This project is licensed under the **MIT License**.

---

## Author

**Nathanael Mutua**

Software Engineering Student | Software Developer
