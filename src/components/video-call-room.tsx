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

type CaptionPayload = {
  speakerName: string;
  text: string;
  isFinal: boolean;
  language: string;
  at: number;
};

type LiveCaption = CaptionPayload & {
  source: 'local' | 'remote';
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: {
      transcript?: string;
    };
  }>;
};

type SpeechRecognitionErrorLike = {
  error?: string;
};

type VideoCallRoomProps = {
  room: string;
  signalingUrl: string;
  fallbackUrl: string;
  displayName: string;
  role: 'patient' | 'professional' | 'owner' | 'guest';
  openFallback: () => Promise<void>;
  leaveCall: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

const CAPTION_LANGUAGE = 'pt-BR';
const CAPTION_CLEAR_DELAY_MS = 5600;
const CAPTION_MAX_LENGTH = 260;

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
  displayName,
  role,
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
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionSupport, setCaptionSupport] = useState<'checking' | 'supported' | 'unsupported'>('checking');
  const [captionNotice, setCaptionNotice] = useState<string | null>(null);
  const [liveCaption, setLiveCaption] = useState<LiveCaption | null>(null);
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
  const captionsEnabledRef = useRef(true);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const captionClearTimerRef = useRef<number | null>(null);

  const elapsedLabel = useMemo(() => {
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [elapsed]);
  const isCareTeam = role === 'professional' || role === 'owner';
  const clinicianName = isCareTeam ? displayName : 'Dra. Helena';
  const patientName = isCareTeam ? 'Paciente' : displayName;
  const sessionStatus = remoteConnected ? 'Conectado' : localReady ? 'Aguardando' : 'Preparando';
  const clinicianMicEnabled = isCareTeam ? micEnabled : remoteMedia.micEnabled;
  const patientMicEnabled = isCareTeam ? remoteMedia.micEnabled : micEnabled;
  const connectionLabel = remoteConnected ? 'Conexao boa' : sessionStatus;
  const statusText = captionNotice ?? status;

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

  const showCaption = useCallback((caption: LiveCaption) => {
    if (captionClearTimerRef.current) {
      window.clearTimeout(captionClearTimerRef.current);
      captionClearTimerRef.current = null;
    }

    setLiveCaption(caption);

    if (caption.isFinal) {
      captionClearTimerRef.current = window.setTimeout(() => {
        setLiveCaption(null);
      }, CAPTION_CLEAR_DELAY_MS);
    }
  }, []);

  const publishCaption = useCallback((text: string, isFinal: boolean) => {
    const captionText = sanitizeCaption(text);

    if (!captionText) {
      return;
    }

    const payload: CaptionPayload = {
      speakerName: displayName,
      text: captionText,
      isFinal,
      language: CAPTION_LANGUAGE,
      at: Date.now(),
    };

    showCaption({ ...payload, source: 'local' });
    sendSignal('caption', payload);
  }, [displayName, sendSignal, showCaption]);

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
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (captionClearTimerRef.current) {
      window.clearTimeout(captionClearTimerRef.current);
      captionClearTimerRef.current = null;
    }
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
        return;
      }

      if (message.type === 'caption') {
        const payload = message.payload as Partial<CaptionPayload> | undefined;
        const captionText = sanitizeCaption(payload?.text);
        const speakerName = sanitizeSpeakerName(payload?.speakerName);

        if (captionText) {
          showCaption({
            speakerName,
            text: captionText,
            isFinal: Boolean(payload?.isFinal),
            language: payload?.language ?? CAPTION_LANGUAGE,
            at: typeof payload?.at === 'number' ? payload.at : Date.now(),
            source: 'remote',
          });
        }
      }
    } catch {
      setStatus('Reconectando sinalizacao da chamada');
    }
  }, [closePeer, createOffer, ensurePeerConnection, flushPendingCandidates, sendMediaState, sendSignal, showCaption]);

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
    captionsEnabledRef.current = captionsEnabled;
  }, [captionsEnabled]);

  useEffect(() => {
    if (!localReady) {
      return undefined;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setCaptionSupport('unsupported');
      setCaptionNotice('Legendas ao vivo nao estao disponiveis neste navegador.');
      return undefined;
    }

    setCaptionSupport('supported');

    if (!captionsEnabled || !micEnabled) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      return undefined;
    }

    let active = true;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = CAPTION_LANGUAGE;

    recognition.onresult = (event) => {
      let transcript = '';
      let isFinal = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        transcript += result[0]?.transcript ?? '';
        isFinal = isFinal || result.isFinal;
      }

      publishCaption(transcript, isFinal);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setCaptionsEnabled(false);
        setCaptionNotice('Permissao de fala negada para legendas ao vivo.');
        return;
      }

      if (event.error && event.error !== 'no-speech') {
        setCaptionNotice('Legendas pausadas. Toque em Legendas para tentar novamente.');
      }
    };

    recognition.onend = () => {
      if (!active || !captionsEnabledRef.current || !micEnabledRef.current) {
        return;
      }

      window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // O navegador pode ainda estar finalizando a instancia anterior.
        }
      }, 450);
    };

    try {
      recognition.start();
      setCaptionNotice(null);
    } catch {
      setCaptionNotice('Nao foi possivel iniciar as legendas agora.');
    }

    return () => {
      active = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.abort();
      } catch {
        // Alguns navegadores lancam erro se a captura ja parou.
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [captionsEnabled, localReady, micEnabled, publishCaption]);

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

  const toggleCaptions = useCallback(() => {
    if (captionSupport === 'unsupported') {
      setCaptionNotice('Use Chrome ou Edge no web para legendas ao vivo neste MVP.');
      return;
    }

    setCaptionsEnabled((current) => !current);
    setCaptionNotice(null);
  }, [captionSupport]);

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
      <header className="appHeader">
        <div className="brandCluster">
          <div className="brandMark" aria-hidden="true">
            <Icon name="brain" />
          </div>
          <h1>Teleconsulta</h1>
          <span className="headerDivider" />
          <div className="securePill">
            <Icon name="lock" />
            <span>Sessao segura</span>
          </div>
        </div>
        <div className="shieldButton" aria-label="Sessao segura">
          <Icon name="shield" />
        </div>
      </header>

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
        <main className="callLayout">
          <section className="callMain">
            <div className="stage" aria-label="Videos da chamada">
              <div className="remoteTile">
                <video ref={setRemoteVideoNode} autoPlay playsInline />
                <div className="participantBadge">
                  <span className="presenceDot" />
                  <strong>{clinicianName}</strong>
                </div>
                <div className="connectionBadge">
                  <Icon name="signal" />
                  <strong>{connectionLabel}</strong>
                </div>
                <div className="elapsedPill">{elapsedLabel}</div>
                {!remoteConnected && (
                  <div className="placeholder">
                    <strong>{localReady ? 'Aguardando participante' : 'Preparando sua camera'}</strong>
                    <span>{statusText}</span>
                  </div>
                )}
                {remoteConnected && !remoteMedia.cameraEnabled && (
                  <div className="mediaBadge">Camera pausada</div>
                )}
                {remoteConnected && !remoteMedia.micEnabled && (
                  <div className="mediaBadge lower">Microfone mudo</div>
                )}
                {liveCaption ? (
                  <div className={`captionOverlay ${liveCaption.source}`} aria-live="polite">
                    <span>{liveCaption.source === 'local' ? 'Voce' : liveCaption.speakerName}</span>
                    <strong>{liveCaption.text}</strong>
                  </div>
                ) : null}

                <div className="localTile">
                  <video ref={setLocalVideoNode} autoPlay playsInline muted />
                  {!cameraEnabled && <div className="localOff">Camera desligada</div>}
                </div>
              </div>
            </div>

            <div className="controlDock">
              <button className={`callControl ${micEnabled ? '' : 'isDanger'}`} onClick={toggleMic}>
                <span className="controlIcon"><Icon name={micEnabled ? 'mic' : 'micOff'} /></span>
                <span>Microfone</span>
                <small>^</small>
              </button>
              <button className={`callControl ${cameraEnabled ? '' : 'isDanger'}`} onClick={toggleCamera}>
                <span className="controlIcon"><Icon name={cameraEnabled ? 'camera' : 'cameraOff'} /></span>
                <span>Camera</span>
                <small>^</small>
              </button>
              <button className="callControl" disabled={!canFlipCamera || switchingCamera} onClick={switchCamera}>
                <span className="controlIcon"><Icon name="switch" /></span>
                <span>{switchingCamera ? 'Trocando' : 'Trocar'}</span>
              </button>
              <button className={`callControl ${captionsEnabled ? 'isSelected' : ''}`} onClick={toggleCaptions}>
                <span className="controlIcon"><Icon name="more" /></span>
                <span>Mais</span>
              </button>
              <button className="callControl leaveControl" onClick={handleLeave}>
                <span className="controlIcon"><Icon name="phone" /></span>
                <span>Sair</span>
              </button>
            </div>
          </section>

          <aside className="sessionPanel" aria-label="Informacoes da teleconsulta">
            <div className="panelTopIcon" aria-hidden="true">
              <Icon name="calendar" />
            </div>
            <section className="sessionSummary">
              <div className="summaryIcon">
                <Icon name="calendar" />
              </div>
              <div>
                <h2>Consulta online</h2>
                <p>{elapsedLabel}</p>
              </div>
            </section>

            <div className="panelDivider" />

            <section className="participantList">
              <ParticipantRow
                avatar="H"
                name={clinicianName}
                meta={isCareTeam ? 'Voce' : 'Psicologa'}
                active={true}
                muted={!clinicianMicEnabled}
              />
              <ParticipantRow
                avatar="P"
                name={patientName}
                meta={isCareTeam ? sessionStatus : 'Voce'}
                active={remoteConnected || !isCareTeam}
                muted={!patientMicEnabled}
              />
            </section>

            <div className="panelDivider" />

            <section className="notesPanel">
              <label htmlFor="session-notes">Notas da sessao</label>
              <div className="notesBox">
                <textarea id="session-notes" placeholder="Escreva suas anotacoes..." />
                <Icon name="edit" />
              </div>
            </section>

            <div className="panelStatus">
              <span className={remoteConnected ? 'dot online' : 'dot'} />
              <span>{statusText}</span>
              <strong>{peerCount}/2</strong>
            </div>

            <button className="jitsiButton" aria-label={`Abrir Jitsi em ${fallbackUrl}`} onClick={handleOpenFallback}>
              <Icon name="external" />
              <span>Abrir Jitsi</span>
            </button>
          </aside>
        </main>
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

function ParticipantRow({
  avatar,
  name,
  meta,
  active,
  muted,
}: {
  avatar: string;
  name: string;
  meta: string;
  active: boolean;
  muted: boolean;
}) {
  return (
    <div className="participantRow">
      <div className="avatar" aria-hidden="true">{avatar}</div>
      <div className="participantCopy">
        <strong>{name}</strong>
        <span className={meta === 'Voce' ? 'youBadge' : ''}>
          {meta === 'Voce' ? meta : (
            <>
              <i className={active ? 'tinyDot online' : 'tinyDot'} />
              {meta}
            </>
          )}
        </span>
      </div>
      <div className={muted ? 'participantMic muted' : 'participantMic'} aria-label={muted ? 'Microfone mutado' : 'Microfone ativo'}>
        <Icon name={muted ? 'micOff' : 'mic'} />
      </div>
    </div>
  );
}

type IconName =
  | 'brain'
  | 'lock'
  | 'shield'
  | 'signal'
  | 'mic'
  | 'micOff'
  | 'camera'
  | 'cameraOff'
  | 'switch'
  | 'more'
  | 'phone'
  | 'calendar'
  | 'edit'
  | 'external';

function Icon({ name }: { name: IconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'brain' && (
        <>
          <path {...common} d="M9 4a4 4 0 0 0-4 4 4 4 0 0 0-2 3.5A4.5 4.5 0 0 0 7.5 16H9" />
          <path {...common} d="M15 4a4 4 0 0 1 4 4 4 4 0 0 1 2 3.5A4.5 4.5 0 0 1 16.5 16H15" />
          <path {...common} d="M9 4v16M15 4v16M9 10h6M9 15h6" />
        </>
      )}
      {name === 'lock' && (
        <>
          <rect {...common} x="6" y="10" width="12" height="10" rx="2" />
          <path {...common} d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      )}
      {name === 'shield' && (
        <>
          <path {...common} d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" />
          <path {...common} d="m9 12 2 2 4-5" />
        </>
      )}
      {name === 'signal' && (
        <>
          <path {...common} d="M4 18v-3" />
          <path {...common} d="M9 18v-7" />
          <path {...common} d="M14 18V8" />
          <path {...common} d="M19 18V5" />
        </>
      )}
      {name === 'mic' && (
        <>
          <rect {...common} x="9" y="3" width="6" height="11" rx="3" />
          <path {...common} d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </>
      )}
      {name === 'micOff' && (
        <>
          <path {...common} d="m4 4 16 16" />
          <path {...common} d="M9 9v2a3 3 0 0 0 5 2" />
          <path {...common} d="M15 9V6a3 3 0 0 0-5-2" />
          <path {...common} d="M5 11a7 7 0 0 0 11 5M19 11a7 7 0 0 1-1 3M12 18v3" />
        </>
      )}
      {name === 'camera' && (
        <>
          <rect {...common} x="3" y="7" width="13" height="10" rx="2" />
          <path {...common} d="m16 10 5-3v10l-5-3" />
        </>
      )}
      {name === 'cameraOff' && (
        <>
          <path {...common} d="m4 4 16 16" />
          <path {...common} d="M3 9a2 2 0 0 1 2-2h7l4 4v4" />
          <path {...common} d="M16 10l5-3v8M7 17H5a2 2 0 0 1-2-2v-2" />
        </>
      )}
      {name === 'switch' && (
        <>
          <path {...common} d="M17 2v5h-5" />
          <path {...common} d="M7 22v-5h5" />
          <path {...common} d="M19 9a7 7 0 0 0-12-4L5 7" />
          <path {...common} d="M5 15a7 7 0 0 0 12 4l2-2" />
        </>
      )}
      {name === 'more' && (
        <>
          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        </>
      )}
      {name === 'phone' && (
        <path {...common} d="M5 15c4-3 10-3 14 0l-2 4-4-2h-2l-4 2-2-4Z" />
      )}
      {name === 'calendar' && (
        <>
          <rect {...common} x="4" y="5" width="16" height="15" rx="2" />
          <path {...common} d="M8 3v4M16 3v4M4 10h16M9 14h3" />
        </>
      )}
      {name === 'edit' && (
        <>
          <path {...common} d="M4 20h4l11-11-4-4L4 16v4Z" />
          <path {...common} d="m13 7 4 4" />
        </>
      )}
      {name === 'external' && (
        <>
          <path {...common} d="M14 4h6v6" />
          <path {...common} d="m10 14 10-10" />
          <path {...common} d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
        </>
      )}
    </svg>
  );
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function sanitizeCaption(value?: string | null) {
  const text = value?.replace(/\s+/g, ' ').trim();

  return text ? text.slice(0, CAPTION_MAX_LENGTH) : '';
}

function sanitizeSpeakerName(value?: string | null) {
  const name = value?.replace(/\s+/g, ' ').trim();

  return name ? name.slice(0, 80) : 'Participante';
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
    background: #060b0a;
  }

  button {
    font: inherit;
  }

  svg {
    width: 1em;
    height: 1em;
    display: block;
  }

  .callShell {
    min-height: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 24px 26px;
    color: #edf7f2;
    background: #070d0c;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    border: 1px solid rgba(237, 247, 242, 0.08);
    border-radius: 22px;
    overflow: hidden;
  }

  .appHeader {
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    flex: 0 0 auto;
  }

  .brandCluster {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 16px;
  }

  .brandMark {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: #55dcbf;
    font-size: 31px;
  }

  .brandCluster h1 {
    margin: 0;
    color: #f4f7f5;
    font-size: clamp(25px, 2.4vw, 34px);
    line-height: 1;
    letter-spacing: 0;
    font-weight: 850;
  }

  .headerDivider {
    width: 1px;
    height: 28px;
    background: rgba(237, 247, 242, 0.13);
  }

  .securePill {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #55dcbf;
    font-size: 14px;
    font-weight: 750;
  }

  .securePill svg {
    font-size: 22px;
  }

  .shieldButton {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(237, 247, 242, 0.12);
    border-radius: 12px;
    color: #55dcbf;
    background: rgba(255, 255, 255, 0.035);
    font-size: 24px;
  }

  .callLayout {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(330px, 372px);
    gap: 10px;
  }

  .callMain {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .remoteTile,
  .localTile {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(237, 247, 242, 0.13);
    background: #0b1210;
    box-shadow: 0 22px 48px rgba(0, 0, 0, 0.32);
  }

  .remoteTile {
    width: 100%;
    height: 100%;
    border-radius: 12px;
  }

  .localTile {
    position: absolute;
    right: 22px;
    bottom: 22px;
    width: min(22vw, 246px);
    min-width: 164px;
    aspect-ratio: 4 / 3;
    border-radius: 10px;
    z-index: 4;
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

  .participantBadge,
  .connectionBadge,
  .elapsedPill {
    position: absolute;
    z-index: 5;
    display: flex;
    align-items: center;
    border: 1px solid rgba(237, 247, 242, 0.08);
    color: #f4f7f5;
    background: rgba(8, 11, 10, 0.78);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(12px);
  }

  .participantBadge {
    top: 20px;
    left: 20px;
    gap: 10px;
    min-height: 48px;
    padding: 0 16px;
    border-radius: 12px;
    font-size: 17px;
  }

  .presenceDot,
  .tinyDot {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #66ddc4;
  }

  .connectionBadge {
    top: 20px;
    right: 20px;
    gap: 9px;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    font-size: 15px;
  }

  .connectionBadge svg {
    color: #55dcbf;
    font-size: 23px;
  }

  .elapsedPill {
    left: 20px;
    bottom: 20px;
    min-height: 38px;
    padding: 0 13px;
    border-radius: 10px;
    font-size: 17px;
    font-variant-numeric: tabular-nums;
    font-weight: 780;
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
    background: rgba(8, 15, 13, 0.84);
    z-index: 3;
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
    inset: 78px auto auto 20px;
    min-width: 136px;
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(8, 15, 13, 0.82);
    color: #edf7f2;
    font-size: 12px;
    font-weight: 800;
    z-index: 6;
  }

  .mediaBadge.lower {
    top: 118px;
  }

  .captionOverlay {
    position: absolute;
    left: 24px;
    right: clamp(210px, 26vw, 304px);
    bottom: 76px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px 16px;
    border: 1px solid rgba(237, 247, 242, 0.16);
    border-radius: 16px;
    color: #edf7f2;
    text-align: left;
    background: rgba(4, 10, 8, 0.78);
    backdrop-filter: blur(14px);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.32);
    z-index: 6;
  }

  .captionOverlay.local {
    opacity: 0.78;
  }

  .captionOverlay span {
    color: #8fe6c6;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .captionOverlay strong {
    color: #ffffff;
    font-size: clamp(16px, 2vw, 24px);
    line-height: 1.28;
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

  .controlDock,
  .fallbackActions {
    min-height: 112px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 10px;
    padding: 15px 18px 17px;
    border: 1px solid rgba(237, 247, 242, 0.06);
    border-radius: 16px;
    background: rgba(13, 22, 20, 0.92);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 20px 44px rgba(0, 0, 0, 0.22);
  }

  .callControl {
    min-width: 92px;
    display: grid;
    justify-items: center;
    gap: 8px;
    border: 0;
    color: #edf7f2;
    background: transparent;
    cursor: pointer;
  }

  .controlIcon {
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(237, 247, 242, 0.08);
    border-radius: 999px;
    color: #55dcbf;
    background: rgba(255, 255, 255, 0.075);
    font-size: 28px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .callControl span:not(.controlIcon) {
    min-height: 17px;
    color: #f4f7f5;
    font-size: 14px;
    line-height: 1;
    font-weight: 680;
  }

  .callControl small {
    margin-left: 5px;
    color: #f4f7f5;
    opacity: 0.8;
  }

  .callControl:hover:not(:disabled) .controlIcon,
  .callControl.isSelected .controlIcon {
    border-color: rgba(85, 220, 191, 0.42);
    background: rgba(85, 220, 191, 0.14);
  }

  .callControl:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .callControl.isDanger .controlIcon {
    color: #ffb3b3;
    background: rgba(176, 66, 66, 0.22);
  }

  .leaveControl .controlIcon {
    color: #ffffff;
    background: #ee5b63;
  }

  .sessionPanel {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 26px 25px 25px;
    border: 1px solid rgba(237, 247, 242, 0.10);
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(21, 32, 29, 0.92), rgba(14, 22, 20, 0.92));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
  }

  .panelTopIcon {
    position: absolute;
    top: 25px;
    right: 22px;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #55dcbf;
    background: rgba(85, 220, 191, 0.14);
    font-size: 25px;
  }

  .sessionSummary {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-right: 52px;
  }

  .summaryIcon {
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #55dcbf;
    background: rgba(85, 220, 191, 0.13);
    font-size: 27px;
  }

  .sessionSummary h2,
  .notesPanel label {
    margin: 0;
    color: #f4f7f5;
    font-size: 18px;
    line-height: 1.15;
    font-weight: 820;
  }

  .sessionSummary p {
    margin: 5px 0 0;
    color: #b8c3bf;
    font-size: 17px;
    font-variant-numeric: tabular-nums;
  }

  .panelDivider {
    height: 1px;
    background: rgba(237, 247, 242, 0.11);
  }

  .participantList {
    display: grid;
    gap: 23px;
  }

  .participantRow {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) 34px;
    align-items: center;
    gap: 14px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(237, 247, 242, 0.16);
    border-radius: 999px;
    color: #10211d;
    background: linear-gradient(145deg, #cfe6dd, #8bbdad);
    font-size: 17px;
    font-weight: 900;
  }

  .participantCopy {
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  .participantCopy strong {
    overflow: hidden;
    color: #f4f7f5;
    font-size: 16px;
    line-height: 1.1;
    font-weight: 760;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .participantCopy span {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #b8c3bf;
    font-size: 13px;
    line-height: 1;
  }

  .youBadge {
    width: fit-content;
    padding: 5px 8px;
    border-radius: 6px;
    color: #55dcbf !important;
    background: rgba(85, 220, 191, 0.16);
    font-weight: 780;
  }

  .tinyDot {
    width: 8px;
    height: 8px;
    background: rgba(184, 195, 191, 0.42);
  }

  .tinyDot.online {
    background: #66ddc4;
  }

  .participantMic {
    color: #55dcbf;
    font-size: 27px;
  }

  .participantMic.muted {
    color: #8b9691;
  }

  .notesPanel {
    display: grid;
    gap: 14px;
  }

  .notesBox {
    position: relative;
    min-height: 150px;
    border: 1px solid rgba(237, 247, 242, 0.12);
    border-radius: 12px;
    background: rgba(5, 11, 10, 0.18);
  }

  .notesBox textarea {
    width: 100%;
    min-height: 148px;
    resize: none;
    border: 0;
    outline: 0;
    padding: 16px 46px 16px 16px;
    color: #f4f7f5;
    background: transparent;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
  }

  .notesBox textarea::placeholder {
    color: rgba(237, 247, 242, 0.45);
  }

  .notesBox svg {
    position: absolute;
    top: 16px;
    right: 16px;
    color: #d6dfdb;
    font-size: 20px;
  }

  .panelStatus {
    min-height: 22px;
    display: flex;
    align-items: center;
    gap: 9px;
    color: #b8c3bf;
    font-size: 13px;
    line-height: 1.3;
  }

  .panelStatus strong {
    margin-left: auto;
    color: #d6dfdb;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .jitsiButton {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: auto;
    border: 1px solid rgba(85, 220, 191, 0.82);
    border-radius: 12px;
    color: #55dcbf;
    background: rgba(5, 11, 10, 0.24);
    cursor: pointer;
    font-size: 18px;
    font-weight: 820;
  }

  .jitsiButton:hover {
    background: rgba(85, 220, 191, 0.11);
  }

  .jitsiButton svg {
    font-size: 22px;
  }

  .fallbackActions {
    min-height: auto;
    flex-wrap: wrap;
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0;
  }

  .controlButton {
    min-height: 48px;
    min-width: 132px;
    border: 1px solid rgba(237, 247, 242, 0.13);
    border-radius: 999px;
    padding: 0 18px;
    color: #edf7f2;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  .controlButton.primary {
    border-color: rgba(85, 220, 191, 0.5);
    color: #08100e;
    background: #55dcbf;
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
      gap: 14px;
      padding: 14px;
      border-radius: 0;
    }

    .appHeader,
    .brandCluster {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .headerDivider,
    .shieldButton {
      display: none;
    }

    .callLayout {
      grid-template-columns: 1fr;
      overflow-y: auto;
    }

    .callMain {
      min-height: 620px;
    }

    .stage {
      min-height: 420px;
    }

    .localTile {
      right: 10px;
      bottom: 10px;
      width: 36vw;
      min-width: 124px;
      border-radius: 14px;
    }

    .captionOverlay {
      left: 10px;
      right: 10px;
      bottom: calc(27vw + 24px);
      text-align: center;
    }

    .controlDock {
      min-height: auto;
      flex-wrap: wrap;
      justify-content: center;
    }

    .callControl {
      min-width: 92px;
    }

    .sessionPanel {
      min-height: 520px;
    }
  }
`;
