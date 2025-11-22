import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker to use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default pdfjsLib;
