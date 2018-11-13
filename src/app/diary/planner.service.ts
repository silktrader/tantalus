import { Injectable } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, take, share, shareReplay } from 'rxjs/operators';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { firestore } from 'firebase';
import { FoodData, FoodDataID } from '../FoodData';
import { PortionData } from './PortionData';
import { Meal } from '../models/meal';
import { Food } from '../foods/food';
import { Portion } from '../models/portion';
import { FoodsService } from '../foods.service';
import * as shortid from 'shortid';

@Injectable({ providedIn: 'root' })
export class PlannerService {

  private dateYMD: DateYMD;
  private _date: Date;
  private document: AngularFirestoreDocument<IDiaryEntry>;
  private _meals: Observable<ReadonlyArray<Meal>>;

  private _recordedMeals: number[] = [];
  private _availableMeals: number[] = [];

  public focusedMeal = 0;

  constructor(private readonly auth: AuthService, private readonly af: AngularFirestore, private readonly foodService: FoodsService) { }

  public initialise(dateYMD: DateYMD) {
    this.dateYMD = dateYMD;
    this._date = new Date(dateYMD.year, dateYMD.month - 1, dateYMD.day);
    this.document = this.getDocument(this.dateYMD);

    this._meals = this.getMeals();     // tk change to subject?

    this._meals.subscribe(meals => {

      if (meals === undefined)
        return;

      this._recordedMeals = meals.map(meal => meal.order);
      this._availableMeals = [0, 1, 2, 3, 4, 5].filter(index => this._recordedMeals.indexOf(index) < 0);
    });
  }

  private getDocument(dateURL: DateYMD): AngularFirestoreDocument<IDiaryEntry> {
    return this.af.doc<IDiaryEntry>(`/users/${this.auth.userID}/diary/${+dateURL.year}-${+dateURL.month}-${+dateURL.day}`
    );
  }

  public get date(): Readonly<Date> {
    return this._date;
  }

  public get meals(): Observable<ReadonlyArray<Meal>> {
    return this._meals;
  }

  public get recordedMeals(): ReadonlyArray<number> {
    return this._recordedMeals;
  }

  public get availableMeals(): ReadonlyArray<number> {
    return this._availableMeals;
  }

  public getLastMeal(): Observable<number> {
    return this._meals.pipe(map(meals => meals.length));
  }

  private getMeals(): Observable<Meal[]> {
    let portions: PortionData[];

    return this.document
      .valueChanges()
      .pipe(
        switchMap((data: IDiaryEntry) => {
          if (data === undefined)
            return of();

          portions = data.portions;

          // draft an array of food ids employed while removing duplicates
          const foodIDs = Array.from(new Set<string>(portions.map(portion => portion.foodID)));

          // fetch food observables and assing missing id property
          const foods$: Observable<Food>[] = foodIDs.map(id => this.foodService.getFood(id));

          return combineLatest(foods$);
        }),
        map(foods => this.createMeals(portions, foods)),
        shareReplay(1)
      );
  }

  private createMeals(portions: PortionData[], foods: Food[]): Meal[] {
    const meals: Meal[] = [];

    for (let i = 0; i < portions.length; i++) {
      const { id, quantity, mealID, foodID } = portions[i];

      if (id === undefined)
        continue; // tk

      if (meals[mealID] === undefined)
        meals[mealID] = new Meal(mealID);

      const portionFood: Food | undefined = foods.find(food => food.id === foodID);
      if (portionFood === undefined)
        continue; // tk warn user?

      meals[mealID].addPortion(new Portion(id, quantity, portionFood, mealID));
    }

    // filter out undefined meals when gaps are present, tk sort them later
    return meals
      .filter(meal => meal !== undefined)
      .sort((a: Meal, b: Meal) => a.order - b.order);
  }

  public getMealName(index: number) {
    return Meal.getName(index);
  }

  public getPortion(portionID: string): Observable<Portion | undefined> {

    return this._meals.pipe(
      switchMap((meals: ReadonlyArray<Meal>) => {

        for (let i = 0; i < meals.length; i++) {
          for (let x = 0; x < meals[i].portions.length; x++) {
            if (meals[i].portions[x].id === portionID) {
              return of(meals[i].portions[x]);
            }
          }
        }

        // in case nothing was found return an empty observable
        return of();
      }
      ));
  }

  public addPortion(portionData: PortionData): Promise<PortionData> {

    // generate a short ID and append it to the portion data
    const portionDataID = { id: shortid.generate(), ...portionData };

    // do not rewrite the entire document but add to its portions array
    return (<any>this.document).set(
      { portions: firestore.FieldValue.arrayUnion(portionDataID) },
      { merge: true }
    ).then(() => portionDataID);
  }

  public changePortion(removedPortion: PortionData, newPortion: PortionData): Promise<[void, void]> {
    const document = <any>this.document;
    const removal: Promise<void> = document.set(
      { portions: firestore.FieldValue.arrayRemove(removedPortion) },
      { merge: true }
    );
    const addition: Promise<void> = document.set(
      { portions: firestore.FieldValue.arrayUnion(newPortion) },
      { merge: true }
    );
    return Promise.all([removal, addition]);
  }

  public removePortion(removedPortion: PortionData): Promise<void> {
    console.log('del ' + removedPortion);
    return (<any>this.document).set(
      { portions: firestore.FieldValue.arrayRemove(removedPortion) },
      { merge: true }
    );
  }

  public deleteDay(): Observable<IDiaryEntry | undefined> {

    return this.document.valueChanges().pipe(
      take(1),
      switchMap((contents) => {
        if (contents === undefined) {
          return of(undefined);
        }
        return this.document.delete().then(() => {
          return contents;
        });
      })
    );
  }

  public writeDay(entry: IDiaryEntry): Promise<void> {
    return this.document.set(entry);
  }
}

export interface DateYMD {

  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface IDiaryEntry {
  comments?: string;
  portions: PortionData[];
}

export interface DiaryEntryData {
  comments?: string;
  portionsFoodData: PortionFoodData;
}

export interface PortionFoodData {
  id: string;
  mealID: number;
  foodData: FoodData;
  quantity: number;
}
