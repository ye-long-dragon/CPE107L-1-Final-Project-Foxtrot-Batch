
function format(command) {
  document.execCommand(command, false, null);
}

function handleFile(input) {
  const file = input.files[0];
  if (!file) return;

  alert("File attached: " + file.name);
}

