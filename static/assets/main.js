(function () {
  'use strict';

  window.addEventListener('load', init, false);

  var defaultClientId = 'gopher-gala-2015@julienc';
  // UI
  var editor = null;
  var output = document.getElementById('js-output');
  var instructionsTpl = document.getElementById('js-instructions-tpl');
  var saveBtn = document.getElementById('js-btn-gist');
  var chatTxt = document.getElementById('js-chat-txt');
  var chatInput = document.getElementById('js-chat-input');

  // WebSocket
  var wsLocal = null;
  var wsRemote = null;

  // Message handling
  var msgCtrl = {
    info: function (data) {
      setOutput(data.Body);
      setChatText(data.Body);
    },
    code: function (data) {
      if (data.Body) {
        saveBtn.disabled = false;
        setText(data.Body, true);
      }
      sendCode(data.Body);
    },
    error: function (data) {
      setOutput(data.Body, 'error');
    },
    stderr: function (data) {
      saveBtn.disabled = false;
      setOutput(data.Body, 'stderr');
    },
    stdout: function (data) {
      saveBtn.disabled = false;
      setOutput(data.Body, 'success', true);
    },
    gist: function (data) {
      setOutput('Code saved @ ' + data.Body, 'success');
      setChatText('Code saved @ ' + data.Body);
    }
  };

  // Socket controller
  var socketCtrl = {
    connected: false,

    open: function () {
      if (!socketCtrl.connected) {
        socketCtrl.connected = true;
        setOutput('Connected to socket', 'success');
        setChatText('Connected to chat');
      }
    },

    close: function () {
      if (socketCtrl.connected) {
        setOutput('Disconneced', 'error');
      }
      socketCtrl.connected = false;
    },

    error: function (e) {
      console.log('socket error:', e);
      setOutput('Socket error:', 'error');
    },

    message: function (e) {
      var data = JSON.parse(e.data);
      console.log('Message:', data);

      if (typeof msgCtrl[data.Kind] === 'function') {
        msgCtrl[data.Kind](data);
      }
    },

    send: function (ws, payload) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    }
  };


  function init() {
    initEditor();
    initSocket();
    // UI event handlers
    saveBtn.addEventListener('click', saveCode, false);
  }

  function initEditor() {
    editor = ace.edit('js-editor');
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/tomorrow_night_eighties');
    editor.getSession().setMode('ace/mode/golang');
    editor.setDisplayIndentGuides(false);
    editor.setFontSize(13);
    editor.setHighlightActiveLine(false);
    editor.setShowFoldWidgets(false);
    editor.setShowInvisibles(false);
    editor.setShowPrintMargin(false);
    editor.setKeyboardHandler('ace/keyboard/vim');

    setText(instructionsTpl.textContent.trim());

    editor.focus();

    editor.commands.addCommand({
      name: 'saveFile',
      bindKey: { win: 'Ctrl-S', mac: 'Command-S', sender: 'editor|cli' },
      exec: function (env) {
        sendMessage('format', env.getValue());
      }
    });

    ace.config.loadModule('ace/keyboard/vim', function(m) {
      var vim = ace.require('ace/keyboard/vim').CodeMirror.Vim;
      vim.defineEx('write', 'w', function(cm, input) {
        cm.ace.execCommand('saveFile');
      });
    });
  }

  function setText(str, write) {
    var val = editor.getValue();
    str = write ? str : val + str;

    editor.setReadOnly(true);
    editor.setValue(str);
    editor.setReadOnly(false);
    editor.clearSelection();

  }

  function sendMessage(kind, body, args) {
    if (wsLocal && wsLocal.readyState === WebSocket.OPEN) {
      wsLocal.send(JSON.stringify({
        Id: 'gopher-gala-2015@julienc',
        Kind: kind,
        Body: body,
        Args: args
      }));
    }
  }

  function initSocket() {
    wsLocal = new WebSocket('ws://localhost:8000/ws');
    wsLocal.addEventListener('open', socketHandler, false);
    wsLocal.addEventListener('close', socketHandler, false);
    wsLocal.addEventListener('error', socketHandler, false);
    wsLocal.addEventListener('message', socketHandler, false);

    wsRemote = new WebSocket('ws://localhost:8000/co');
    wsRemote.addEventListener('open', socketHandler, false);
    wsRemote.addEventListener('close', socketHandler, false);
    wsRemote.addEventListener('error', socketHandler, false);
    wsRemote.addEventListener('message', socketHandler, false);
  }

  function socketHandler(e) {
    console.log('WebSocket Event', e.type);
    // handle with socketCtrl
    if (typeof socketCtrl[e.type] === 'function') {
      socketCtrl[e.type](e);
    }
  }

  function sendCode(src) {
    socketCtrl.send(wsRemote, {
      Id: defaultClientId,
      Kind: 'run',
      Body: src
    });
  }

  function saveCode() {
    socketCtrl.send(wsLocal, {
      Id: defaultClientId,
      Kind: 'save',
      Body: editor.getValue()
    });
  }

  function setOutput(txt, cssClasses, empty) {
    var el = document.createElement('pre');
    el.classList.add('text');

    if (cssClasses) {
      cssClasses = cssClasses.split(' ');
      var i = 0, l = cssClasses.length;
      for ( ; i < l; i++) {
        el.classList.add(cssClasses[i]);
      }
    }
    el.innerHTML += txt;

    if (empty) { output.innerHTML = ''; }

    output.appendChild(document.createDocumentFragment().appendChild(el));
    output.scrollTop = output.scrollHeight - output.offsetHeight;
  }

  function setChatText(str) {
    chatTxt.value += str + '\n';
  }
}());
