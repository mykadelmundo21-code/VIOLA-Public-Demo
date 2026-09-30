import Echo from "laravel-echo";
import Pusher from "pusher-js";

(window as any).Pusher = Pusher;

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") || sessionStorage.getItem("viola_token")
  );
}

export const echo = import.meta.env.VITE_REVERB_APP_KEY
  ? new Echo({
      broadcaster: "reverb",

      key: import.meta.env.VITE_REVERB_APP_KEY,

      wsHost: import.meta.env.VITE_REVERB_HOST || "127.0.0.1",

      wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),

      wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),

      forceTLS: false,

      enabledTransports: ["ws", "wss"],

      authEndpoint: `${API_BASE_URL}/broadcasting/auth`,

      auth: {
        headers: {
          Accept: "application/json",
        },
      },

      authorizer: (channel: any) => {
        return {
          authorize: (
            socketId: string,
            callback: (error: any, data: any) => void,
          ) => {
            const token = getAuthToken();

            if (!token) {
              callback(new Error("No authentication token found."), null);

              return;
            }

            fetch(`${API_BASE_URL}/broadcasting/auth`, {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
              .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                  callback(
                    new Error(
                      data?.message || "Unable to authorize broadcast channel.",
                    ),
                    data,
                  );

                  return;
                }

                callback(null, data);
              })
              .catch((error) => {
                callback(error, null);
              });
          },
        };
      },
    })
  : null;
