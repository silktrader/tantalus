import { Injectable } from '@angular/core';
import { Observable, of, combineLatest, BehaviorSubject, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { firestore } from 'firebase';
import { FoodData } from '../foods/shared/food';
import { PortionData } from './PortionData';
import { Meal } from '../models/meal';
import { Food } from '../foods/shared/food';
import { Portion } from '../models/portion';
import { FoodsService } from '../foods/foods.service';
import * as shortid from 'shortid';
import { DiaryEntry } from '../models/diary-entry';
import { UiService } from '../ui.service';
import { CalendarService } from '../calendar/calendar.service';

@Injectable({ providedIn: 'root' })
export class PlannerService {

  private _date: Date;
  private serialisedData: IDiaryEntry;

  public diaryEntry = new BehaviorSubject<DiaryEntry>(new DiaryEntry([]));
  private dateYMD = new BehaviorSubject<DateYMD>(CalendarService.getYMD(new Date()));

  private subscription: Subscription;

  constructor(private auth: AuthService, private af: AngularFirestore, private foodService: FoodsService, private ui: UiService) {

  }

  public focusedMeal = 0;

  public get date(): Readonly<Date> {
    return this._date;
  }

  // should this be configurable by users? tk
  public get availableMealsIDs(): ReadonlyArray<number> {
    return Meal.mealIDs;
  }

  public initialise(dateYMD: DateYMD) {

    if (this.subscription)
      this.subscription.unsubscribe();

    let portions: PortionData[];
    let data: IDiaryEntry;

    this.subscription = this.dateYMD.pipe(
      switchMap(() => this.document.valueChanges()),
      switchMap(diaryData => {

        // for some reason combineLatest([]) doesn't emit values whereas of([]) does, without emission new diary entries won't be written
        if (diaryData === undefined || diaryData.portions.length === 0) {
          portions = [];
          return of([]);
        }

        data = diaryData;
        portions = diaryData.portions;

        // draft an array of food ids employed while removing duplicates
        const foodIDs = Array.from(new Set<string>(portions.map(portion => portion.foodID)));

        // fetch food observables and assing missing id property
        const foods$: Observable<Food | undefined>[] = foodIDs.map(id => this.foodService.getFood(id));
        return combineLatest(foods$);
      })).subscribe((foods: (Food | undefined)[]) => {
        this.serialisedData = data;
        this.diaryEntry.next(new DiaryEntry(this.createMeals(portions, foods.filter((food: Food | undefined) => food !== undefined) as Food[])));
        this.focusedMeal = this.getLatestMeal(this.diaryEntry.getValue().meals);
      });

    this.dateYMD.next(dateYMD);
    this._date = CalendarService.getDate(dateYMD); // tk change and verify URL!
  }

  public reset() {
    this.subscription.unsubscribe();
  }

  private get document(): AngularFirestoreDocument<IDiaryEntry> {
    const id = CalendarService.getID(this.dateYMD.getValue());
    return this.af.doc<IDiaryEntry>(`/users/${this.auth.userID}/diary/${id}`);
  }

  private createMeals(portions: PortionData[], foods: Food[]): Meal[] {
    const meals: Array<Meal> = [];

    for (let i = 0; i < portions.length; i++) {
      const { id, quantity, mealID, foodID } = portions[i];
      const selectedFood: Food | undefined = foods.find(food => food.id === foodID);

      if (id === undefined || selectedFood === undefined) {
        this.ui.warn(`Unable to read portion ${id || 'missing ID'} of ${selectedFood || 'missing food'}`);
        continue;
      }

      // create the meal whether necessary
      if (meals[mealID] === undefined)
        meals[mealID] = new Meal(mealID);

      meals[mealID].addPortion(new Portion(id, quantity, selectedFood, mealID));
    }

    // filter out undefined meals when gaps are present, tk sort them later
    return meals.filter(meal => meal !== undefined).sort((a: Meal, b: Meal) => a.order - b.order);
  }

  public getMealName(index: number) {
    return Meal.getName(index);
  }

  public get mealNumbers(): ReadonlyArray<Number> {
    return this.diaryEntry.getValue().meals.map(meal => meal.order);
  }

  private getLatestMeal(meals: ReadonlyArray<Meal>): number {
    let latestMealID = 0;
    for (let i = 0; i < meals.length; i++) {
      if (meals[i].order > latestMealID)
        latestMealID = meals[i].order;
    }
    return latestMealID;
  }

  public get meals(): ReadonlyArray<Meal> {
    return this.diaryEntry.getValue().meals;
  }

  public addPortion(portionData: PortionData): Promise<PortionData> {

    // generate a short ID and append it to the portion data
    const portionDataID = { id: shortid.generate(), ...portionData };

    // do not rewrite the entire document but add to its portions array
    return (<any>this.document).set({
      portions: firestore.FieldValue.arrayUnion(portionDataID),
      // register the food ID for queries
      foods: firestore.FieldValue.arrayUnion(portionData.foodID)
    },
      { merge: true }
    ).then(() => portionDataID);
  }

  /**
   * Matches the new portion ID to an exiting portions and overwrites data
   * @param newPortionData Data to be overwritten
   */
  public changePortion(newPortionData: PortionData): Promise<void> {

    // substitute the old portion data with new one
    const newPortions: Array<PortionData> = [];
    for (const portion of this.serialisedData.portions) {
      if (portion.id === newPortionData.id)
        newPortions.push(newPortionData);
      else newPortions.push(portion);
    }

    return <any>this.document.set(
      { portions: newPortions },
      { merge: true }
    );
  }

  public removePortion(removedPortion: PortionData): Promise<void> {
    return (<any>this.document).update(
      { portions: firestore.FieldValue.arrayRemove(removedPortion) }
    );
  }

  public deleteDay(): Promise<IDiaryEntry | null> {

    // cache old value
    const deletedData = this.serialisedData;

    return this.document.delete().then(
      () => deletedData,
      () => null);
  }

  public restoreDay(data: IDiaryEntry): Promise<void> {

    return (<any>this.document).set(data);
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

export interface IDiaryEntryData extends IDiaryEntry {
  id: string;
  foods: Array<string>;
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
