(function () {
  'use strict';

  window.addEventListener('load', init, false);

  // UI
  var editor = null;
  var instructions = document.getElementById('tpl-instructions');

  function init() {
    initEditor();
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
        // sendCode(env.getValue());
      }
    });

    ace.config.loadModule('ace/keyboard/vim', function(m) {
      var vim = ace.require('ace/keyboard/vim').CodeMirror.Vim;
      vim.defineEx('write', 'w', function(cm, input) {
        cm.ace.execCommand('saveFile');
      });
    });
  }

  function setText(str) {
    editor.setReadOnly(true);
    editor.setValue(str);
    editor.setReadOnly(false);
    editor.clearSelection();
  }

  function saveFile(str) {

  }

}());
