import { Meal } from './meal';
import { Portion } from './portion';

export class DiaryEntry {

    public readonly meals: ReadonlyArray<Meal>;

    constructor(meals: Meal[]) {
        this.meals = meals || [];
    }

    public getPortion(portionID: string): Portion | undefined {
        for (let i = 0; i < this.meals.length; i++) {
            for (let x = 0; x < this.meals[i].portions.length; x++) {
                if (this.meals[i].portions[x].id === portionID) {
                    return this.meals[i].portions[x];
                }
            }
        }
    }

    private getAggregate(propertyName: string): number {
        let total = 0;
        for (let i = 0; i < this.meals.length; i++)
            total += this.meals[i][propertyName];
        return total;
    }

    public get calories(): number {
        return this.getAggregate('calories');
    }

    public get proteins(): number {
        return this.getAggregate('proteins');
    }

    public get carbs(): number {
        return this.getAggregate('carbs');
    }

    public get fats(): number {
        return this.getAggregate('fats');
    }

}
