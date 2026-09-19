/**
 * Stub determinista del SDK de Twilio Video (CDN) para la suite E2E (F5).
 *
 * Se sirve en lugar de https://sdk.twilio.com/** vía `page.route`, por lo que
 * `lib/twilio/twilio-loader.ts` lo consume sin tocar el código de producción.
 * Cubre los estados que sí son verificables sin media real: connect →
 * conectado → toggles de mic/cámara → disconnect. Expone `window.__fakeTwilio`
 * para que los specs puedan disparar eventos y espiar la conexión.
 */
(function () {
  "use strict";

  function makeTrack(kind, name) {
    return {
      kind: kind,
      name: name || kind,
      id: kind + "-" + Math.random().toString(36).slice(2),
      isEnabled: true,
      enable: function () {
        this.isEnabled = true;
      },
      disable: function () {
        this.isEnabled = false;
      },
      attach: function () {
        var el = document.createElement("video");
        el.muted = true;
        el.autoplay = true;
        el.playsInline = true;
        return el;
      },
      detach: function () {
        return [];
      },
      stop: function () {},
    };
  }

  function makePublications(options) {
    var publications = new Map();
    publications.set("audio-1", { track: makeTrack("audio") });
    if (!options || options.video !== false) {
      publications.set("video-1", { track: makeTrack("video") });
    }
    return publications;
  }

  async function connect(token, options) {
    var handlers = {};
    var room = {
      localParticipant: {
        identity: "e2e-local",
        tracks: makePublications(options),
      },
      participants: new Map(),
      on: function (event, cb) {
        (handlers[event] || (handlers[event] = [])).push(cb);
        return room;
      },
      off: function () {
        return room;
      },
      disconnect: function () {
        (handlers.disconnected || []).forEach(function (cb) {
          cb(room);
        });
      },
    };

    var previousCalls =
      window.__fakeTwilio && window.__fakeTwilio.connectCalls
        ? window.__fakeTwilio.connectCalls
        : 0;

    window.__fakeTwilio = {
      room: room,
      token: token,
      connectCalls: previousCalls + 1,
      emit: function (event) {
        var args = Array.prototype.slice.call(arguments, 1);
        (handlers[event] || []).forEach(function (cb) {
          cb.apply(null, args);
        });
      },
    };

    // Retardo artificial para observar el estado "Conectando…" del prejoin.
    await new Promise(function (resolve) {
      setTimeout(resolve, 800);
    });
    return room;
  }

  window.Twilio = { Video: { connect: connect } };
})();
