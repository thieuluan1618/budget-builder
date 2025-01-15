import { Component } from '@angular/core';
import { BudgetBuilderComponent } from "./budget-builder/budget-builder.component";


@Component({
  selector: 'app-root',
  imports: [BudgetBuilderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'budget-builder';
}
