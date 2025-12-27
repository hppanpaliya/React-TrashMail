# TrashMail Frontend

This is the React frontend for the TrashMail application.

## Environment Variables

Create a `.env` file in the `react` directory and add the following variables:

```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_DOMAINS=["example.com"]
```

- `REACT_APP_API_URL`: The URL of the backend API server (default: http://localhost:4000).
- `REACT_APP_DOMAINS`: Array of allowed email domains for the service.

## Installation

1.  Navigate to the `react` directory:
    ```bash
    cd react
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running

### Development

To run the app in development mode:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Production

To build the app for production:

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Testing

To run the tests:

```bash
npm test
```

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `yarn build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
