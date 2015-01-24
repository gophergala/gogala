(function () {
  'use strict';

  window.addEventListener('load', init, false);

  // UI
  var editor = null;
  var output = document.getElementById('output');
  var text = document.getElementById('text');
  var instructions = document.getElementById('tpl-instructions');
  var saveBtn = document.getElementById('btn-gist');

  // WebSocket
  var wsLocal = null;
  var wsRemote = null;

  var connClosed = true;

  // Message handling
  var msgCtrl = {
    info: function (data) {
      setOutput(data.Body);
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
    }
  };

  // Socket controller
  var socketCtrl = {
    connected: false,

    open: function () {
      socketCtrl.connected = true;
      setOutput('Connected to socket', 'success');
    },

    close: function () {
      socketCtrl.connected = false;
      setOutput('Disconneced', 'error');
    }
  };


  function init() {
    initEditor();
    initSocket();
    // UI event handlers
    saveBtn.addEventListener('click', saveCode, false);
    // saveBtn.disabled = true;
  }

  function initEditor() {
    editor = ace.edit('editor');
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

    setText(instructions.textContent.trim());

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
    wsLocal.addEventListener('message', messageHandler, false);

    wsRemote = new WebSocket('ws://localhost:8000/co');
    wsRemote.addEventListener('open', socketHandler, false);
    wsRemote.addEventListener('close', socketHandler, false);
    wsRemote.addEventListener('error', socketHandler, false);
    wsRemote.addEventListener('message', messageHandler, false);
  }

  function socketHandler(e) {
    console.log('WebSocket Event', e.type, e);

    if (e.type === 'open' && connClosed) {
      connClosed = false;
      setOutput('Connected to socket.', 'success');


    }

    if (e.type === 'error') {
      setOutput('WebSocket error', 'error');
    }
    if (e.type === 'close' && !connClosed) {
      connClosed = true;
      setOutput('Connection closed. Try reloading.', 'error');
    }


    // handle with socketCtrl
    if (typeof socketCtrl[e.type] === 'function') {
      socketCtrl[e.type]();
    }
  }

  function messageHandler(e) {
    var data = JSON.parse(e.data);

    console.log('message', data);
    debugger;

    if (typeof msgCtrl[data.Kind] === 'function') {
      console.log('handler', msgCtrl[data.Kind]);
      msgCtrl[data.Kind](data);
    }

    // if (data.Kind === 'info') {
    //   // This is information
    //   setText('\n\n// ' + data.Body + '\n')
    //
    // } else if (data.Kind === 'code') {
    //   // Display formatted code and send code to socket
    //   setText(data.Body, true);
    //   sendCode(data.Body);
    //
    // } else if (data.Kind === 'stdout') {
    //   // Display results
    //
    // } else if (data.Kind === 'stderr') {
    //   // Display errors
    // }
  }

  function sendCode(src) {
    if (wsRemote && wsRemote.readyState === WebSocket.OPEN) {
      wsRemote.send(JSON.stringify({
        Id: 'gopher-gala-2015@julienc',
        Kind: 'run',
        Body: src
      }));
    }
  }

  function setOutput(txt, cssClasses, empty) {
    var el = document.createElement('pre');
    el.classList.add('text');
    el.classList.add('unselectable');

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

  function saveCode() {
    if (wsLocal && wsLocal.readyState === WebSocket.OPEN) {
      debugger;

      wsLocal.send(JSON.stringify({
        Id: 'gopher-gala-2015@julienc',
        Kind: 'save',
        Body: editor.getValue()
      }));
    }
  }

}());
