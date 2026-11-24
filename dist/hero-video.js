"use strict";

(() => {
  const video = document.querySelector(".hero-video-source");
  const canvas = document.querySelector(".hero-video");
  const visual = video.closest(".hero-visual");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  let inView = false;
  let draw = null;
  let unavailable = false;
  let frameRequest = null;
  const canRequestVideoFrame = typeof video.requestVideoFrameCallback === "function";

  function createCanvasRenderer() {
    const context = canvas.getContext("2d");
    if (!context) return null;

    const { width, height } = canvas;
    const mask = document.createElement("canvas");
    mask.width = width / 2;
    mask.height = height / 2;
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    if (!maskContext) return null;

    return () => {
      maskContext.globalCompositeOperation = "copy";
      maskContext.drawImage(video, width, 0, width, height, 0, 0, mask.width, mask.height);
      const image = maskContext.getImageData(0, 0, mask.width, mask.height);
      const pixels = image.data;
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i + 3] = Math.round((pixels[i] - 6) * (255 / 245));
      }
      maskContext.putImageData(image, 0, 0);
      context.globalCompositeOperation = "copy";
      context.drawImage(video, 0, 0, width, height, 0, 0, width, height);
      context.globalCompositeOperation = "destination-in";
      context.drawImage(mask, 0, 0, width, height);
    };
  }

  function createRenderer() {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false
    });
    if (!gl) return createCanvasRenderer();

    function compile(type, code) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    }

    const vertex = compile(gl.VERTEX_SHADER, `
      attribute vec2 pos;
      varying vec2 uv;
      void main() {
        gl_Position = vec4(pos, 0.0, 1.0);
        uv = vec2((pos.x + 1.0) * 0.5, (1.0 - pos.y) * 0.5);
      }
    `);
    const fragment = compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D frame;
      varying vec2 uv;
      void main() {
        // The left half carries color. The right half is the grayscale alpha mask.
        vec2 coordinate = vec2(clamp(uv.x, 0.001, 0.999) * 0.5, uv.y);
        vec3 color = texture2D(frame, coordinate).rgb;
        float alpha = texture2D(frame, coordinate + vec2(0.5, 0.0)).r;
        gl_FragColor = vec4(color, smoothstep(0.025, 0.985, alpha));
      }
    `);
    if (!vertex || !fragment) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    const corners = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.viewport(0, 0, canvas.width, canvas.height);

    return () => {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  function shouldPlay() {
    return !unavailable && inView && !document.hidden && !reducedMotion.matches && !connection?.saveData;
  }

  function showPhoto() {
    visual.classList.remove("is-video-playing");
    if (frameRequest === null) return;
    if (canRequestVideoFrame) video.cancelVideoFrameCallback(frameRequest);
    else cancelAnimationFrame(frameRequest);
    frameRequest = null;
  }

  function renderFrame() {
    frameRequest = null;
    if (!shouldPlay() || video.paused) return;

    try {
      draw();
    } catch {
      disableVideo();
      return;
    }
    visual.classList.add("is-video-playing");
    frameRequest = canRequestVideoFrame
      ? video.requestVideoFrameCallback(renderFrame)
      : requestAnimationFrame(renderFrame);
  }

  function disableVideo() {
    unavailable = true;
    video.pause();
    showPhoto();
  }

  function syncPlayback() {
    if (!shouldPlay()) {
      video.pause();
      showPhoto();
      if ((reducedMotion.matches || connection?.saveData) && video.hasAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
      return;
    }

    draw ||= createRenderer();
    if (!draw) {
      disableVideo();
      return;
    }

    if (!video.hasAttribute("src")) video.src = video.dataset.src;
    if (video.paused) video.play()?.catch(showPhoto);
  }

  video.addEventListener("playing", () => {
    if (frameRequest === null) renderFrame();
  });
  video.addEventListener("pause", showPhoto);
  video.addEventListener("error", disableVideo);
  canvas.addEventListener("webglcontextlost", disableVideo);
  reducedMotion.addEventListener("change", syncPlayback);
  connection?.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(visual);
  } else {
    inView = true;
    syncPlayback();
  }
})();
