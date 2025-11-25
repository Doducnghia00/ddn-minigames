# Guest Login Setup

Guest login allows users to play without creating an account or signing in with Google. This is the simplest authentication method and requires no external services.

## Configuration

### Client

Edit `client/.env.development`:

```env
# Enable guest login
VITE_ENABLE_GUEST_LOGIN=true

# Disable Google login (optional)
VITE_ENABLE_GOOGLE_LOGIN=false

# Backend URLs
VITE_API_URL=http://localhost:2567
VITE_WS_URL=ws://localhost:2567
```

### Server

Edit `server/.env.development`:

```env
# Enable guest login
ENABLE_GUEST_LOGIN=true

# Disable Google login (optional)
ENABLE_GOOGLE_LOGIN=false

# Server Configuration
PORT=2567
NODE_ENV=development
```

## Features

- **No setup required**: Works out of the box
- **Username validation**: 2-20 characters, letters, numbers, spaces, hyphens, underscores
- **Session persistence**: Guest sessions are saved in localStorage
- **Unique IDs**: Each guest gets a unique identifier

## Limitations

- **No cross-device sync**: Guest sessions are tied to the browser
- **No account recovery**: Clearing browser data loses the guest session
- **Limited features**: Some features may require a full account

## Usage

1. Start the server and client
2. Navigate to the login page
3. Enter a username (2-20 characters)
4. Click "Play as Guest"

That's it! No Firebase configuration needed.

## Combining with Google Login

You can enable both guest and Google login:

```env
VITE_ENABLE_GUEST_LOGIN=true
VITE_ENABLE_GOOGLE_LOGIN=true
```

Users will see both options on the login page.

See [auth-firebase.md](auth-firebase.md) for Google login setup.
