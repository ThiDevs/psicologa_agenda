using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace PsiAgenda.Api.Endpoints;

public static class VideoCallEndpoints
{
    private static readonly Regex RoomPattern = new("^[a-zA-Z0-9][a-zA-Z0-9_-]{2,96}$", RegexOptions.Compiled);

    public static IEndpointRouteBuilder MapVideoCallEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/video-call/signaling/{room}", HandleSignalingAsync)
            .AllowAnonymous()
            .WithTags("Video Calls");

        return app;
    }

    private static async Task HandleSignalingAsync(
        HttpContext context,
        string room,
        VideoCallSignalingHub hub)
    {
        if (!RoomPattern.IsMatch(room))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { message = "Sala invalida." }, context.RequestAborted);
            return;
        }

        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { message = "Use WebSocket para entrar na chamada." }, context.RequestAborted);
            return;
        }

        using var socket = await context.WebSockets.AcceptWebSocketAsync();
        await hub.ConnectAsync(room, socket, context.RequestAborted);
    }
}

public sealed class VideoCallSignalingHub
{
    private const int MaxMessageBytes = 64 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> RelayMessageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "offer",
        "answer",
        "ice-candidate",
        "ready",
        "media-state"
    };

    private readonly ConcurrentDictionary<string, VideoCallRoom> rooms = new(StringComparer.OrdinalIgnoreCase);

    public async Task ConnectAsync(string roomId, WebSocket socket, CancellationToken cancellationToken)
    {
        var room = rooms.GetOrAdd(roomId, _ => new VideoCallRoom());
        var client = new SignalingClient(Guid.NewGuid().ToString("N"), socket);
        var join = room.TryAdd(client);

        if (!join.Accepted)
        {
            await client.SendAsync(new { type = "room-full" }, cancellationToken);
            await client.CloseAsync("Sala cheia.", cancellationToken);
            return;
        }

        await client.SendAsync(new { type = "joined", peerId = client.Id, peers = join.PeerIds }, cancellationToken);
        await BroadcastAsync(join.ExistingClients, new { type = "peer-joined", peerId = client.Id }, cancellationToken);

        try
        {
            await ReceiveLoopAsync(room, client, cancellationToken);
        }
        finally
        {
            var leave = room.Remove(client.Id);

            if (leave.Removed)
            {
                await BroadcastAsync(leave.RemainingClients, new { type = "peer-left", peerId = client.Id }, CancellationToken.None);
            }

            if (room.IsEmpty)
            {
                rooms.TryRemove(roomId, out _);
            }
        }
    }

    private static async Task ReceiveLoopAsync(
        VideoCallRoom room,
        SignalingClient client,
        CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && client.Socket.State == WebSocketState.Open)
        {
            var message = await ReceiveTextAsync(client.Socket, cancellationToken);

            if (message is null)
            {
                break;
            }

            var relay = CreateRelayMessage(message, client.Id);

            if (relay is null)
            {
                continue;
            }

            await BroadcastRawAsync(room.GetRecipients(client.Id), relay, cancellationToken);
        }
    }

    private static async Task<string?> ReceiveTextAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        var buffer = new byte[8 * 1024];
        using var stream = new MemoryStream();

        while (true)
        {
            var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                return null;
            }

            if (result.MessageType != WebSocketMessageType.Text)
            {
                return string.Empty;
            }

            stream.Write(buffer, 0, result.Count);

            if (stream.Length > MaxMessageBytes)
            {
                return string.Empty;
            }

            if (result.EndOfMessage)
            {
                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }
    }

    private static string? CreateRelayMessage(string message, string senderId)
    {
        try
        {
            using var document = JsonDocument.Parse(message);
            var root = document.RootElement;

            if (!root.TryGetProperty("type", out var typeElement))
            {
                return null;
            }

            var type = typeElement.GetString();

            if (string.IsNullOrWhiteSpace(type) || !RelayMessageTypes.Contains(type))
            {
                return null;
            }

            using var stream = new MemoryStream();
            using var writer = new Utf8JsonWriter(stream);

            writer.WriteStartObject();
            writer.WriteString("type", type);
            writer.WriteString("from", senderId);

            if (root.TryGetProperty("payload", out var payload))
            {
                writer.WritePropertyName("payload");
                payload.WriteTo(writer);
            }

            writer.WriteEndObject();
            writer.Flush();

            return Encoding.UTF8.GetString(stream.ToArray());
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static Task BroadcastAsync(IEnumerable<SignalingClient> clients, object payload, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        return BroadcastRawAsync(clients, json, cancellationToken);
    }

    private static async Task BroadcastRawAsync(IEnumerable<SignalingClient> clients, string json, CancellationToken cancellationToken)
    {
        foreach (var client in clients)
        {
            await client.SendRawAsync(json, cancellationToken);
        }
    }

    private sealed class VideoCallRoom
    {
        private const int MaxClients = 2;
        private readonly object gate = new();
        private readonly Dictionary<string, SignalingClient> clients = [];

        public bool IsEmpty
        {
            get
            {
                lock (gate)
                {
                    return clients.Count == 0;
                }
            }
        }

        public RoomJoinResult TryAdd(SignalingClient client)
        {
            lock (gate)
            {
                if (clients.Count >= MaxClients)
                {
                    return new RoomJoinResult(false, [], []);
                }

                var peerIds = clients.Keys.ToArray();
                var existingClients = clients.Values.ToArray();
                clients.Add(client.Id, client);

                return new RoomJoinResult(true, peerIds, existingClients);
            }
        }

        public SignalingClient[] GetRecipients(string senderId)
        {
            lock (gate)
            {
                return clients.Values
                    .Where(client => client.Id != senderId)
                    .ToArray();
            }
        }

        public RoomLeaveResult Remove(string clientId)
        {
            lock (gate)
            {
                var removed = clients.Remove(clientId);

                return new RoomLeaveResult(
                    removed,
                    clients.Values.ToArray());
            }
        }
    }

    private sealed record RoomJoinResult(
        bool Accepted,
        string[] PeerIds,
        SignalingClient[] ExistingClients);

    private sealed record RoomLeaveResult(
        bool Removed,
        SignalingClient[] RemainingClients);

    private sealed class SignalingClient(string id, WebSocket socket)
    {
        private readonly SemaphoreSlim sendLock = new(1, 1);

        public string Id { get; } = id;
        public WebSocket Socket { get; } = socket;

        public Task SendAsync(object payload, CancellationToken cancellationToken)
        {
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            return SendRawAsync(json, cancellationToken);
        }

        public async Task SendRawAsync(string json, CancellationToken cancellationToken)
        {
            if (Socket.State != WebSocketState.Open)
            {
                return;
            }

            var bytes = Encoding.UTF8.GetBytes(json);
            await sendLock.WaitAsync(cancellationToken);

            try
            {
                if (Socket.State == WebSocketState.Open)
                {
                    await Socket.SendAsync(
                        new ArraySegment<byte>(bytes),
                        WebSocketMessageType.Text,
                        true,
                        cancellationToken);
                }
            }
            finally
            {
                sendLock.Release();
            }
        }

        public async Task CloseAsync(string reason, CancellationToken cancellationToken)
        {
            if (Socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                await Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, reason, cancellationToken);
            }
        }
    }
}
