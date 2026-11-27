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
- Copy QR code to clipboard, or share it from a phone
- Paste a link, email, phone link or Wi-Fi string and the right type is picked for you
- A badge that says whether the code should scan
- Remembers your last style, shares a style as a link, and keeps up to three saved styles
- Keyboard shortcuts: Ctrl/⌘+S downloads the PNG, Ctrl/⌘+C copies from the focused preview
- Installable, and works offline after the first visit
- Responsive layout down to phone width
- Light and dark theme that follows your system, with a toggle that remembers your choice
- Keyboard and screen reader friendly controls

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
│   ├── js/
│   │   ├── app.js          # Entry point, wires the modules together
│   │   ├── utils.js        # Builds the QR payload for each type
│   │   ├── form-switcher.js # QR type segmented control
│   │   ├── theme.js        # Light and dark theme toggle
│   │   ├── color-picker.js # Colors, gradient and contrast check
│   │   ├── qr-style.js     # Shapes, presets, logo, remembered and linked styles
│   │   ├── brands.js       # Up to three saved styles, kept on this device
│   │   ├── qr-svg.js       # SVG renderer used for preview and exports
│   │   └── qr-generator.js # Preview, PNG/SVG download, copy, share and shortcuts
│   ├── sw.js               # Offline support: network first, cache when offline
│   ├── manifest.webmanifest # Install as an app
│   └── icons/              # App and favicon icons
├── tests/                  # Node tests for the renderer, colors, styles and logo picker,
│                           # qr payloads, saved styles, the download and copy notes, the password toggle, the type switcher and the theme
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
node tests/qr-generator.test.mjs
node tests/brands.test.mjs
node tests/sw.test.mjs
node tests/form-switcher.test.mjs
node tests/theme.test.mjs
node tests/variables.test.mjs
```

---

## Use Cases

- Personal or business QR generation
- Portfolio project for frontend development
- Learning vanilla JavaScript DOM manipulation
- Lightweight QR solution without frameworks

---

## Future Improvements

- QR code history using `localStorage`
- Bulk QR generation

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
