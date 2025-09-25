import { Component } from '@angular/core';
import { EditorComponent } from './editor/editor';

@Component({
  selector: 'app-root',
  imports: [EditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
