import {Component, OnInit, Input, Output, EventEmitter, SimpleChanges} from '@angular/core';
import {ResourceUtils} from "../../utils/ResourceUtils";
import {VBPreferences} from "../../utils/VBPreferences";
import {Languages} from "../../models/LanguagesCountries";

@Component({
    selector: 'lang-picker',
    templateUrl: './langPickerComponent.html',
})
export class LangPickerComponent implements OnInit {
    
    @Input() lang: string;
    @Input() size: string = "sm";
    @Input() disabled: boolean = false;
    @Output() langChange = new EventEmitter<any>();
    
    private selectClass: string = "form-control input-";
    private languageList = Languages.languageList;
    private language: string;
    
    constructor(private pref: VBPreferences) { }

    ngOnInit() {
        if (this.size == "xs" || this.size == "sm" || this.size == "md" || this.size == "lg") {
            this.selectClass += this.size;
        } else {
            this.selectClass += "sm";
        }
        if (this.lang == undefined) {
            this.language = this.pref.getDefaultLanguage();//if lang is not provided set the default language
            this.langChange.emit(this.language);//and emit langChange event
        } else {
            this.language = this.lang;
        }
    }
    
    //handle the change of lang from "outside" the component and not from UI
    ngOnChanges(changes: SimpleChanges) {
        if (changes['lang']) {
            this.language = changes['lang'].currentValue;
        }
    }
    
    private onLangChange(newLang: string) {
        this.language = newLang;
        this.langChange.emit(newLang);
    }
    
    private getFlagImgSrc(): string {
        return ResourceUtils.getFlagImgSrc(this.language);
    }
    
}