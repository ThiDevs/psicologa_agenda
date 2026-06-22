'use dom';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SignalMessage = {
  type: string;
  peerId?: string;
  peers?: string[];
  payload?: unknown;
};

type MediaState = {
  micEnabled: boolean;
  cameraEnabled: boolean;
};

type VideoCallRoomProps = {
  room: string;
  signalingUrl: string;
  fallbackUrl: string;
  openFallback: () => Promise<void>;
  leaveCall: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const videoConstraints: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

export default function VideoCallRoom({
  room,
  signalingUrl,
  fallbackUrl,
  openFallback,
  leaveCall,
}: VideoCallRoomProps) {
  const [status, setStatus] = useState('Preparando camera e microfone');
  const [error, setError] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [canFlipCamera, setCanFlipCamera] = useState(false);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remoteMedia, setRemoteMedia] = useState<MediaState>({
    micEnabled: true,
    cameraEnabled: true,
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerStartedRef = useRef(false);
  const leaveRequestedRef = useRef(false);
  const currentVideoDeviceIdRef = useRef<string | null>(null);
  const micEnabledRef = useRef(true);
  const cameraEnabledRef = useRef(true);

  const elapsedLabel = useMemo(() => {
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [elapsed]);

  const attachStream = useCallback((element: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!element) {
      return;
    }

    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }

    if (stream) {
      void element.play().catch(() => undefined);
    }
  }, []);

  const sendSignal = useCallback((type: string, payload?: unknown) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({ type, payload }));
  }, []);

  const sendMediaState = useCallback(() => {
    sendSignal('media-state', {
      micEnabled: micEnabledRef.current,
      cameraEnabled: cameraEnabledRef.current,
    });
  }, [sendSignal]);

  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    attachStream(remoteVideoRef.current, null);
    pendingCandidatesRef.current = [];
    offerStartedRef.current = false;
    setRemoteConnected(false);
  }, [attachStream]);

  const cleanupCall = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    closePeer();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    attachStream(localVideoRef.current, null);
  }, [attachStream, closePeer]);

  const flushPendingCandidates = useCallback(async (peer: RTCPeerConnection) => {
    if (!peer.remoteDescription) {
      return;
    }

    const candidates = pendingCandidatesRef.current.splice(0);

    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (peerRef.current) {
      return peerRef.current;
    }

    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    attachStream(remoteVideoRef.current, remoteStream);

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current as MediaStream);
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate.toJSON());
      }
    };

    peer.ontrack = (event) => {
      const inboundStream = event.streams[0];

      if (inboundStream) {
        remoteStreamRef.current = inboundStream;
        attachStream(remoteVideoRef.current, inboundStream);
      } else if (!remoteStream.getTracks().some((track) => track.id === event.track.id)) {
        remoteStream.addTrack(event.track);
        attachStream(remoteVideoRef.current, remoteStream);
      }

      setRemoteConnected(true);
      setStatus('Chamada conectada');
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setRemoteConnected(true);
        setStatus('Chamada conectada');
      }

      if (peer.connectionState === 'connecting') {
        setStatus('Conectando video e audio');
      }

      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        setStatus('Conexao instavel. O Jitsi esta disponivel como segunda opcao.');
      }
    };

    return peer;
  }, [attachStream, sendSignal]);

  const createOffer = useCallback(async () => {
    if (offerStartedRef.current) {
      return;
    }

    offerStartedRef.current = true;

    try {
      const peer = ensurePeerConnection();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal('offer', toDescriptionPayload(peer.localDescription));
      setStatus('Chamando participante');
    } catch {
      setError('Nao foi possivel iniciar a chamada nativa. Use o Jitsi como segunda opcao.');
    }
  }, [ensurePeerConnection, sendSignal]);

  const handleSignal = useCallback(async (message: SignalMessage) => {
    try {
      if (message.type === 'joined') {
        const peers = Array.isArray(message.peers) ? message.peers : [];
        setPeerCount(Math.min(peers.length + 1, 2));

        if (peers.length > 0) {
          setStatus('Participante encontrado. Negociando video');
          await createOffer();
        } else {
          setStatus('Aguardando a outra pessoa entrar');
        }

        return;
      }

      if (message.type === 'peer-joined') {
        setPeerCount(2);
        setStatus('Participante entrou. Conectando video');
        ensurePeerConnection();
        sendMediaState();
        return;
      }

      if (message.type === 'peer-left') {
        closePeer();
        setPeerCount(1);
        setStatus('A outra pessoa saiu da chamada');
        return;
      }

      if (message.type === 'room-full') {
        setError('Esta sala ja esta com duas pessoas conectadas. Abra o Jitsi como contingencia.');
        return;
      }

      if (message.type === 'offer') {
        const peer = ensurePeerConnection();
        await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
        await flushPendingCandidates(peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal('answer', toDescriptionPayload(peer.localDescription));
        sendMediaState();
        setStatus('Respondendo a chamada');
        return;
      }

      if (message.type === 'answer') {
        const peer = ensurePeerConnection();

        if (peer.signalingState !== 'stable') {
          await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
          await flushPendingCandidates(peer);
        }

        sendMediaState();
        return;
      }

      if (message.type === 'ice-candidate') {
        const candidate = message.payload as RTCIceCandidateInit;
        const peer = peerRef.current;

        if (!peer || !peer.remoteDescription) {
          pendingCandidatesRef.current.push(candidate);
          return;
        }

        await peer.addIceCandidate(candidate);
        return;
      }

      if (message.type === 'media-state') {
        const payload = message.payload as Partial<MediaState> | undefined;

        setRemoteMedia((current) => ({
          micEnabled: payload?.micEnabled ?? current.micEnabled,
          cameraEnabled: payload?.cameraEnabled ?? current.cameraEnabled,
        }));
      }
    } catch {
      setStatus('Reconectando sinalizacao da chamada');
    }
  }, [closePeer, createOffer, ensurePeerConnection, flushPendingCandidates, sendMediaState, sendSignal]);

  useEffect(() => {
    if (!localReady) {
      return undefined;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [localReady]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
        throw new Error('Este dispositivo nao oferece WebRTC suficiente para a chamada nativa.');
      }

      setStatus('Pedindo permissao de camera e microfone');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoConstraints,
      });

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      const localVideoTrack = stream.getVideoTracks()[0];
      currentVideoDeviceIdRef.current = localVideoTrack?.getSettings().deviceId ?? null;
      attachStream(localVideoRef.current, stream);
      setLocalReady(true);

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      setCanFlipCamera(devices.filter((device) => device.kind === 'videoinput').length > 1);

      setStatus('Entrando na sala');
      const socket = new WebSocket(signalingUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) {
          setStatus('Conectando sinalizacao');
        }
      };

      socket.onmessage = (event) => {
        if (cancelled) {
          return;
        }

        try {
          void handleSignal(JSON.parse(event.data as string) as SignalMessage);
        } catch {
          setStatus('Mensagem de sinalizacao ignorada');
        }
      };

      socket.onerror = () => {
        if (!cancelled) {
          setError('Nao foi possivel conectar a sala nativa. Use o Jitsi como segunda opcao.');
        }
      };

      socket.onclose = () => {
        if (!cancelled && !leaveRequestedRef.current) {
          setStatus('Sinalizacao encerrada. O Jitsi esta disponivel como contingencia.');
        }
      };
    }

    start().catch((startError) => {
      if (!cancelled) {
        setError(startError instanceof Error
          ? startError.message
          : 'Nao foi possivel acessar camera e microfone.');
      }
    });

    return () => {
      cancelled = true;
      cleanupCall();
    };
  }, [attachStream, cleanupCall, handleSignal, signalingUrl]);

  const setLocalVideoNode = useCallback((element: HTMLVideoElement | null) => {
    localVideoRef.current = element;
    attachStream(element, localStreamRef.current);
  }, [attachStream]);

  const setRemoteVideoNode = useCallback((element: HTMLVideoElement | null) => {
    remoteVideoRef.current = element;
    attachStream(element, remoteStreamRef.current);
  }, [attachStream]);

  const toggleMic = useCallback(() => {
    const next = !micEnabledRef.current;
    micEnabledRef.current = next;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
    sendMediaState();
  }, [sendMediaState]);

  const toggleCamera = useCallback(() => {
    const next = !cameraEnabledRef.current;
    cameraEnabledRef.current = next;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
    sendMediaState();
  }, [sendMediaState]);

  const switchCamera = useCallback(async () => {
    if (!canFlipCamera || switchingCamera) {
      return;
    }

    setSwitchingCamera(true);

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      const currentIndex = videoInputs.findIndex((device) => device.deviceId === currentVideoDeviceIdRef.current);
      const nextDevice = videoInputs[(currentIndex + 1 + videoInputs.length) % videoInputs.length];

      if (!nextDevice) {
        return;
      }

      const replacementStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: { exact: nextDevice.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      const nextTrack = replacementStream.getVideoTracks()[0];
      const localStream = localStreamRef.current;

      if (!nextTrack || !localStream) {
        replacementStream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStream.getVideoTracks().forEach((track) => {
        localStream.removeTrack(track);
        track.stop();
      });
      localStream.addTrack(nextTrack);
      currentVideoDeviceIdRef.current = nextTrack.getSettings().deviceId ?? nextDevice.deviceId;

      const videoSender = peerRef.current?.getSenders().find((sender) => sender.track?.kind === 'video');
      await videoSender?.replaceTrack(nextTrack);

      cameraEnabledRef.current = true;
      setCameraEnabled(true);
      attachStream(localVideoRef.current, localStream);
      sendMediaState();
    } catch {
      setStatus('Nao foi possivel trocar a camera');
    } finally {
      setSwitchingCamera(false);
    }
  }, [attachStream, canFlipCamera, sendMediaState, switchingCamera]);

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus('Nao foi possivel copiar o link');
    }
  }, []);

  const handleLeave = useCallback(() => {
    leaveRequestedRef.current = true;
    cleanupCall();
    void leaveCall();
  }, [cleanupCall, leaveCall]);

  const handleOpenFallback = useCallback(() => {
    void openFallback();
  }, [openFallback]);

  return (
    <div className="callShell">
      <div className="topBar">
        <div>
          <p className="eyebrow">Sala {room}</p>
          <h1>Chamada de video</h1>
        </div>
        <div className="topMeta">
          <span>{elapsedLabel}</span>
          <span>{peerCount}/2</span>
        </div>
      </div>

      {error ? (
        <main className="fallbackPanel">
          <div className="alertMark">!</div>
          <h2>Chamada nativa indisponivel</h2>
          <p>{error}</p>
          <div className="fallbackActions">
            <button className="controlButton primary" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
            <button className="controlButton" aria-label={`Abrir Jitsi em ${fallbackUrl}`} onClick={handleOpenFallback}>
              Abrir Jitsi
            </button>
            <button className="controlButton subtle" onClick={handleLeave}>
              Sair
            </button>
          </div>
        </main>
      ) : (
        <>
          <section className="stage" aria-label="Videos da chamada">
            <div className="remoteTile">
              <video ref={setRemoteVideoNode} autoPlay playsInline />
              {!remoteConnected && (
                <div className="placeholder">
                  <strong>{localReady ? 'Aguardando participante' : 'Preparando sua camera'}</strong>
                  <span>{status}</span>
                </div>
              )}
              {remoteConnected && !remoteMedia.cameraEnabled && (
                <div className="mediaBadge">Camera pausada</div>
              )}
              {remoteConnected && !remoteMedia.micEnabled && (
                <div className="mediaBadge lower">Microfone mudo</div>
              )}
            </div>

            <div className="localTile">
              <video ref={setLocalVideoNode} autoPlay playsInline muted />
              {!cameraEnabled && <div className="localOff">Camera desligada</div>}
            </div>
          </section>

          <div className="statusLine">
            <span className={remoteConnected ? 'dot online' : 'dot'} />
            <span>{status}</span>
          </div>

          <nav className="controls" aria-label="Controles da chamada">
            <button className={`controlButton ${micEnabled ? '' : 'danger'}`} onClick={toggleMic}>
              {micEnabled ? 'Mutar' : 'Ativar mic'}
            </button>
            <button className={`controlButton ${cameraEnabled ? '' : 'danger'}`} onClick={toggleCamera}>
              {cameraEnabled ? 'Camera off' : 'Camera on'}
            </button>
            <button className="controlButton" disabled={!canFlipCamera || switchingCamera} onClick={switchCamera}>
              {switchingCamera ? 'Trocando' : 'Trocar camera'}
            </button>
            <button className="controlButton" onClick={copyInvite}>
              {copied ? 'Link copiado' : 'Copiar link'}
            </button>
            <button className="controlButton fallback" aria-label={`Abrir Jitsi em ${fallbackUrl}`} onClick={handleOpenFallback}>
              Abrir Jitsi
            </button>
            <button className="controlButton leave" onClick={handleLeave}>
              Sair
            </button>
          </nav>
        </>
      )}

      <style>{css}</style>
    </div>
  );
}

function toDescriptionPayload(description: RTCSessionDescription | null) {
  return description
    ? {
        type: description.type,
        sdp: description.sdp,
      }
    : null;
}

const css = `
  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
  }

  button {
    font: inherit;
  }

  .callShell {
    min-height: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    color: #edf7f2;
    background:
      radial-gradient(circle at top left, rgba(109, 214, 180, 0.14), transparent 34%),
      linear-gradient(180deg, #0d1412 0%, #111c18 58%, #080f0d 100%);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .topBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 58px;
  }

  .topBar h1 {
    margin: 2px 0 0;
    font-size: clamp(22px, 3vw, 34px);
    line-height: 1.05;
  }

  .eyebrow {
    margin: 0;
    color: #8fe6c6;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .topMeta {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #c7d9d1;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  .topMeta span {
    min-width: 48px;
    padding: 8px 10px;
    border: 1px solid rgba(237, 247, 242, 0.12);
    border-radius: 999px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 420px;
    display: grid;
  }

  .remoteTile,
  .localTile {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(237, 247, 242, 0.12);
    background: #07100d;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
  }

  .remoteTile {
    border-radius: 22px;
  }

  .localTile {
    position: absolute;
    right: 18px;
    bottom: 18px;
    width: min(28vw, 260px);
    min-width: 150px;
    aspect-ratio: 4 / 3;
    border-radius: 18px;
  }

  video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    background: #07100d;
  }

  .localTile video {
    transform: scaleX(-1);
  }

  .placeholder,
  .localOff,
  .mediaBadge {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    text-align: center;
    background: linear-gradient(145deg, rgba(15, 28, 24, 0.92), rgba(8, 15, 13, 0.96));
  }

  .placeholder strong {
    font-size: clamp(20px, 3vw, 32px);
  }

  .placeholder span {
    max-width: 460px;
    color: #b8cac2;
    line-height: 1.45;
  }

  .localOff {
    font-size: 13px;
    font-weight: 800;
    color: #edf7f2;
  }

  .mediaBadge {
    inset: auto auto 16px 16px;
    min-width: 136px;
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(8, 15, 13, 0.82);
    color: #edf7f2;
    font-size: 12px;
    font-weight: 800;
  }

  .mediaBadge.lower {
    bottom: 56px;
  }

  .statusLine {
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #b8cac2;
    font-size: 13px;
  }

  .dot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #b7791f;
  }

  .dot.online {
    background: #49d58f;
  }

  .controls,
  .fallbackActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .controlButton {
    min-height: 48px;
    min-width: 104px;
    border: 1px solid rgba(237, 247, 242, 0.12);
    border-radius: 999px;
    padding: 0 16px;
    color: #edf7f2;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  .controlButton:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }

  .controlButton:disabled {
    cursor: not-allowed;
    color: rgba(237, 247, 242, 0.42);
  }

  .controlButton.primary,
  .controlButton.fallback {
    border-color: rgba(109, 214, 180, 0.34);
    background: #1f8a70;
  }

  .controlButton.danger,
  .controlButton.leave {
    border-color: rgba(255, 138, 138, 0.36);
    background: #9f2f2f;
  }

  .controlButton.subtle {
    background: transparent;
  }

  .fallbackPanel {
    flex: 1;
    min-height: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 24px;
    border: 1px solid rgba(237, 247, 242, 0.12);
    border-radius: 22px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
  }

  .fallbackPanel h2 {
    margin: 0;
    font-size: clamp(22px, 4vw, 34px);
  }

  .fallbackPanel p {
    max-width: 560px;
    margin: 0;
    color: #c7d9d1;
    line-height: 1.5;
  }

  .alertMark {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    color: #fff8e7;
    background: #b7791f;
    font-size: 28px;
    font-weight: 900;
  }

  @media (max-width: 720px) {
    .callShell {
      gap: 10px;
      padding: 10px;
    }

    .topBar {
      align-items: flex-start;
      flex-direction: column;
    }

    .stage {
      min-height: calc(100vh - 252px);
    }

    .localTile {
      right: 10px;
      bottom: 10px;
      width: 36vw;
      min-width: 124px;
      border-radius: 14px;
    }

    .controlButton {
      min-width: calc(50% - 6px);
      padding: 0 10px;
      font-size: 13px;
    }
  }
`;
