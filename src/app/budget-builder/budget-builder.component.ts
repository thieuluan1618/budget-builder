import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { CurrencyPipe, DatePipe, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DigitOnlyModule } from '@uiowa/digit-only';

export interface Category {
  id: string;
  name: string;
  amounts: Record<string, number>;
}

export interface ParentCategory {
  id: string;
  name: string;
  amounts: Record<string, number>;
  childCategories: Category[];
}

export interface Section {
  id: string;
  name: string;
  categories: ParentCategory[];
}

interface CellPosition {
  row: number;
  parentIndex: number;
  isChild: boolean;
}

@Component({
  selector: 'app-budget-builder',
  templateUrl: './budget-builder.component.html',
  imports: [
    CurrencyPipe,
    FormsModule,
    NgForOf,
    DatePipe,
    NgIf,
    DigitOnlyModule,
  ],
})
export class BudgetBuilderComponent implements OnInit, AfterViewInit {
  startDate = '2024-01';
  endDate = '2024-12';
  availableDates: string[] = [];

  @ViewChildren('categoryInput') categoryInputs!: QueryList<ElementRef>;

  sections = signal<Section[]>([
    {
      id: 'income',
      name: 'Income',
      categories: [
        {
          id: 'general-income',
          name: 'General Income',
          amounts: {},
          childCategories: [],
        },
        {
          id: 'general-other-income',
          name: 'Other Income',
          amounts: {},
          childCategories: [],
        },
      ],
    },
    {
      id: 'expense',
      name: 'Expense',
      categories: [
        {
          id: 'general-fixed-expenses',
          name: 'Operational Expenses',
          amounts: {},
          childCategories: [],
        },
        {
          id: 'general-variable-expenses',
          name: 'Salaries & Wages',
          amounts: {},
          childCategories: [],
        },
      ],
    },
  ]);

  ngOnInit() {
    this.updateAvailableDates();
  }

  ngAfterViewInit(): void {
    document.getElementById('input-1-2')?.focus();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (
      !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      return;
    }

    const activeElement = document.activeElement as HTMLInputElement;
    if (!activeElement?.id?.startsWith('input-')) {
      return;
    }

    // Handle left/right arrows within the current input if not at edges
    if (event.key === 'ArrowLeft' && activeElement.selectionStart !== 0) {
      return;
    }
    if (
      event.key === 'ArrowRight' &&
      activeElement.selectionStart !== activeElement.value.length
    ) {
      return;
    }

    event.preventDefault();

    const [_, row, col] = activeElement.id.split('-').map(Number);
    let nextRow = row;
    let nextCol = col;

    switch (event.key) {
      case 'ArrowUp':
        nextRow = Math.max(1, row - 1);
        break;
      case 'ArrowDown':
        nextRow = row + 1;
        break;
      case 'ArrowLeft':
        nextCol = Math.max(1, col - 1);
        break;
      case 'ArrowRight':
        nextCol = col + 1;
        break;
    }

    const nextInput = document.getElementById(`input-${nextRow}-${nextCol}`);
    if (nextInput) {
      (nextInput as HTMLInputElement).focus();
    }
  }

  updateAvailableDates() {
    const dates: string[] = [];
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    const current = new Date(start);
    while (current <= end && dates.length < 12) {
      dates.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }

    this.availableDates = dates;
  }

  getCellId(sectionId: string, categoryId: string, colIndex: number): string {
    const position = this.calculateCellPosition(sectionId, categoryId);
    return `${position.row}-${colIndex + 1}`;
  }

  getBalance(month: string): number {
    const totalIncome = this.getSectionTotal('income', month);

    const totalExpenses = this.getSectionTotal('expense', month);

    return totalIncome - totalExpenses;
  }

  getClosingBalance(month: string): number {
    const monthIndex = this.availableDates.indexOf(month);

    if (monthIndex === 0) {
      return this.getBalance(month);
    }

    const previousClosingBalance = this.getClosingBalance(
      this.availableDates[monthIndex - 1],
    );
    return previousClosingBalance + this.getBalance(month);
  }

  getSectionTotal(sectionId: string, month: string): number {
    const section = this.sections().find((s) => s.id === sectionId);
    if (!section) return 0;

    let total = 0;

    section.categories.forEach((category) => {
      total += +category.amounts[month] || 0;

      category.childCategories.forEach((child) => {
        total += +child.amounts[month] || 0;
      });
    });

    return total;
  }

  addParentCategory(sectionId: string) {
    const newParent: ParentCategory = {
      id: crypto.randomUUID(),
      name: '',
      amounts: {},
      childCategories: [],
    };

    this.sections.update((sections) =>
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            categories: [...section.categories, newParent],
          };
        }
        return section;
      }),
    );
  }

  getSubTotal(sectionId: string, categoryId: string, month: string): number {
    const section = this.sections().find((s) => s.id === sectionId);
    if (!section) return 0;

    const category = section.categories.find((c) => c.id === categoryId);
    if (!category) return 0;

    let total = +category.amounts[month] || 0;

    category.childCategories.forEach((child) => {
      total += +child.amounts[month] || 0;
    });

    return total;
  }

  addCategory(sectionId: string, parentId: string) {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: '',
      amounts: {},
    };

    this.sections.update((sections) =>
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            categories: section.categories.map((parent) => {
              if (parent.id === parentId) {
                return {
                  ...parent,
                  childCategories: [...parent.childCategories, newCategory],
                };
              }
              return parent;
            }),
          };
        }
        return section;
      }),
    );

    // After adding the category, find and focus the last input
    setTimeout(() => {
      const inputs = this.categoryInputs.toArray();
      const inputElements = inputs.map((input) => input.nativeElement);

      inputElements.reverse()[0]?.focus();
    });
  }

  deleteParentCategory(sectionId: string, parentId: string) {
    this.sections.update((sections) =>
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            categories: section.categories.filter((p) => p.id !== parentId),
          };
        }
        return section;
      }),
    );
  }

  deleteChildCategory(sectionId: string, parentId: string, childId: string) {
    this.sections.update((sections) =>
      sections.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          categories: section.categories.map((parent) => {
            if (parent.id === parentId) {
              return {
                ...parent,
                childCategories: parent.childCategories.filter(
                  (child) => child.id !== childId,
                ),
              };
            }
            return parent;
          }),
        };
      }),
    );
  }

  updateAmount(
    sectionId: string,
    categoryId: string,
    month: string,
    value: number,
  ) {
    this.sections.update((sections) =>
      sections.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          categories: section.categories.map((parent) => {
            if (parent.id === categoryId) {
              return {
                ...parent,
                amounts: { ...parent.amounts, [month]: value },
              };
            }
            const childCategory = parent.childCategories.find(
              (child) => child.id === categoryId,
            );
            if (childCategory) {
              return {
                ...parent,
                childCategories: parent.childCategories.map((child) =>
                  child.id === categoryId
                    ? {
                        ...child,
                        amounts: { ...child.amounts, [month]: value },
                      }
                    : child,
                ),
              };
            }
            return parent;
          }),
        };
      }),
    );
  }

  private calculateCellPosition(
    sectionId: string,
    categoryId: string,
  ): CellPosition {
    let currentRow = 1;
    let found = false;
    let position: CellPosition = { row: 0, parentIndex: 0, isChild: false };

    for (const section of this.sections()) {
      if (found) break;

      for (
        let parentIndex = 0;
        parentIndex < section.categories.length;
        parentIndex++
      ) {
        const parent = section.categories[parentIndex];

        if (parent.id === categoryId) {
          position = { row: currentRow, parentIndex, isChild: false };
          found = true;
          break;
        }
        currentRow++;

        for (const child of parent.childCategories) {
          if (child.id === categoryId) {
            position = { row: currentRow, parentIndex, isChild: true };
            found = true;
            break;
          }
          currentRow++;
        }
      }
    }

    return position;
  }
}
