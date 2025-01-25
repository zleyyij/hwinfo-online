import { API_URL } from '../config.js';

function renderContent() {
    const container = document.createElement('div');

    container.innerHTML = API_URL ? `<input type="url" id="urlInput" placeholder="Paste link here" pattern="http.*csv"></input>` : ``;

    document.getElementById('upload-dialog').appendChild(container);
}

document.addEventListener('DOMContentLoaded', renderContent);