## Web Maple

This is a fork of Nodein Maple Web.

## Important

All graphics and sound assets are rights reserved to Nexon. This open source project is for research and educational purposes only, with no commercial intent.

## Enhancements

1. Teleportation functionality implemented.
2. Mobs now render with movement and health bars.
3. The stats menu is fully operational, incorporating Maple's calculations for damage.
4. Damage indicators are functional.
5. Players have the ability to walk.
6. Players can shoot arrows to defeat Mobs.
7. Full-screen mode is enabled.
8. Converted the project to TypeScript to facilitate easier future development (Note: This is not perfect but required several days to complete).
9. Added touch controls for mobile devices.
10. EXP is accurate, and player can level up by killing mobs.
11. Mobs drop items on death
12. Player can pick up items from the map (Still need to improve this)

![Screenshot 2024-03-10 at 1 18 04 PM](https://github.com/Jeck-Sparrow-5/MapleWeb/assets/162882278/a865ca04-ff39-41df-8e58-04a457825e10)
![Screenshot 2024-03-10 at 1 17 28 PM](https://github.com/Jeck-Sparrow-5/MapleWeb/assets/162882278/6231bd8f-d593-44d4-96d6-83cd72dad603)

<img width="297" alt="Screenshot 2024-03-10 at 1 21 12 PM" src="https://github.com/Jeck-Sparrow-5/MapleWeb/assets/162882278/cd6a7e4e-fdcc-4656-ad41-31d9fea35d3c">
<img width="610" alt="Screenshot 2024-03-10 at 1 18 13 PM" src="https://github.com/Jeck-Sparrow-5/MapleWeb/assets/162882278/d1073c0b-3039-4a04-af78-8c0f97c0fa0c">
  
## Communication with server

Set the environment variable `VITE_WEBSOCKET_URL` in `.env` to the WebSocket url.

Implementation is still in progress. When the environment variable is not set, it will still work in a local mode for UI development.

### Protocol Converter

As this game is running on a browser, it needs to communicate with the server using WebSocket. While most of the server emulator use TCP sockets, a protocol converter is required for this client to connect to a server.

The proxy is built into the Vite dev server as a plugin — no separate process needed. Running `npm run dev` inside `TypeScript-Client/` automatically starts the WebSocket bridge on `ws://127.0.0.1:8089` and forwards traffic to the Maple TCP server at `127.0.0.1:8484`. The ports can be overridden with environment variables `WS_PORT`, `TCP_HOST`, and `TCP_PORT`.

### Server Emulator (v83)

https://github.com/P0nk/Cosmic
