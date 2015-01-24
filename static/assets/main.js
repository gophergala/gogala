(function () {
  'use strict';

  window.addEventListener('load', init, false);

  // UI
  var editor = null;
  var instructions = document.getElementById('tpl-instructions');
  // WebSocket
  var ws = null;

  function init() {
    initEditor();
    initSocket();
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
        saveFile(env.getValue());
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

  function saveFile(str) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        Id: 'gopher-gala-2015@julienc',
        Kind: 'format',
        Body: editor.getValue()
      }));
    }
  }

  function initSocket() {
    ws = new WebSocket('ws://localhost:8000/ws');
    ws.addEventListener('open', socketHandler, false);
    ws.addEventListener('close', socketHandler, false);
    ws.addEventListener('error', socketHandler, false);
    ws.addEventListener('message', messageHandler, false);
  }

  function socketHandler(e) {
    console.log('WebSocket Event', e.type, e);
  }

  function messageHandler(e) {
    var data = JSON.parse(e.data);

    console.log('message', data);

    if (data.Kind === 'info') {
      setText('\n\n// ' + data.Body + '\n')
    } else if (data.Kind === 'code') {
      setText(data.Body, true);
    }
  }

}());
