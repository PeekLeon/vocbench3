import { Component } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PrefLabelClashMode } from "src/app/models/Properties";
import { VBContext } from "src/app/utils/VBContext";
import { ARTLiteral, ARTNode, ARTURIResource } from "../../../../models/ARTResources";
import { Language } from "../../../../models/LanguagesCountries";
import { ResViewPartition } from "../../../../models/ResourceView";
import { RDFS, SKOS, SKOSXL } from "../../../../models/Vocabulary";
import { CustomFormsServices } from "../../../../services/customFormsServices";
import { PropertyServices, RangeResponse } from "../../../../services/propertyServices";
import { ResourcesServices } from "../../../../services/resourcesServices";
import { BasicModalServices } from "../../../../widget/modal/basicModal/basicModalServices";
import { BrowsingModalServices } from "../../../../widget/modal/browsingModal/browsingModalServices";
import { CreationModalServices } from "../../../../widget/modal/creationModal/creationModalServices";
import { NewXLabelModalReturnData } from "../../../../widget/modal/creationModal/newResourceModal/skos/newXLabelModal";
import { ResViewModalServices } from "../../resViewModals/resViewModalServices";
import { LexicalizationEnrichmentHelper } from "../lexicalizationEnrichmentHelper";
import { MultiActionError, MultiActionFunction } from "../multipleActionHelper";
import { PartitionRenderSingleRoot } from "../partitionRendererSingleRoot";
import { EnrichmentType, PropertyEnrichmentHelper, PropertyEnrichmentInfo } from "../propertyEnrichmentHelper";

@Component({
    selector: "properties-renderer",
    templateUrl: "../partitionRenderer.html",
})
export class PropertiesPartitionRenderer extends PartitionRenderSingleRoot {

    partition = ResViewPartition.properties;
    addBtnImgSrc = "./assets/images/icons/actions/property_create.png";

    constructor(resourcesService: ResourcesServices, propService: PropertyServices, cfService: CustomFormsServices,
        basicModals: BasicModalServices, creationModals: CreationModalServices, resViewModals: ResViewModalServices,
        private browsingModals: BrowsingModalServices, private lexicalizationEnrichmentHelper: LexicalizationEnrichmentHelper,
        private translateService: TranslateService) {
        super(resourcesService, propService, cfService, basicModals, creationModals, resViewModals);
    }

    ngOnInit() {
        super.ngOnInit();
        this.partitionCollapsed = (this.predicateObjectList.length > 5);
    }

    add(predicate: ARTURIResource) {
        /**
         * Lexicalization properties should not be enriched from this partition, it should be used the proper LexicalizationPartitionRenderer instead.
         * Anyway, here the lexicalization properties are handled ad hoc and not by the enrichProperty method in order to
         * be handled in the same way of LexicalizationPartitionRenderer
         */
        if (
            predicate.equals(SKOSXL.prefLabel) || predicate.equals(SKOSXL.altLabel) || predicate.equals(SKOSXL.hiddenLabel) ||
            predicate.equals(SKOS.prefLabel) || predicate.equals(SKOS.altLabel) || predicate.equals(SKOS.hiddenLabel) ||
            predicate.equals(RDFS.label)
        ) {
            PropertyEnrichmentHelper.getPropertyEnrichmentInfo(predicate, this.propService, this.basicModals).subscribe(
                (data: PropertyEnrichmentInfo) => {
                    if (data.type == null) { //range selection canceled
                        return;
                    } else if (data.type == EnrichmentType.customForm) { //if a custom form has been defined, use it
                        this.enrichWithCustomForm(predicate, data.form);
                    } else { //otherwise (default case, where type is "resource" and rangeCollection is [skosxl:Label]) use the proper enrichment service
                        this.enrichWithLabel(predicate);
                    }
                }
            );
        } else {
            this.enrichProperty(predicate);
        }
    }

    private enrichWithLabel(predicate: ARTURIResource) {
        if (predicate.equals(SKOSXL.prefLabel) || predicate.equals(SKOSXL.altLabel) || predicate.equals(SKOSXL.hiddenLabel)) { //SKOSXL
            let prefLabelPred: boolean = predicate.equals(SKOSXL.prefLabel);
            this.creationModals.newXLabel({ key: "ACTIONS.ADD_X", params: { x: predicate.getShow() } }, null, null, null, null, null, { enabled: true, allowSameLang: !prefLabelPred }).then(
                (data: NewXLabelModalReturnData) => {
                    this.addMultipleLabelValues(predicate, data.labels, data.cls);
                },
                () => { }
            );
        } else { //SKOS or RDFS
            let prefLabelPred: boolean = predicate.equals(SKOS.prefLabel);
            this.creationModals.newPlainLiteral({ key: "ACTIONS.ADD_X", params: { x: predicate.getShow() } }, null, null, null, null, null, { enabled: true, allowSameLang: !prefLabelPred }).then(
                (labels: ARTLiteral[]) => {
                    this.addMultipleLabelValues(predicate, labels);
                },
                () => { }
            );
        }
    }

    /**
     * This method is copied from the LexicalizationPartitionRenderer.
     * It is replicated here, for the same reasons explained in this.add(), for handling the enrichment of the lexicalization properties.
     */
    private addMultipleLabelValues(predicate: ARTURIResource, labels: ARTLiteral[], cls?: ARTURIResource) {
        let addFunctions: MultiActionFunction[] = [];
        let errorHandler: (errors: MultiActionError[]) => void;

        //SKOS or SKOSXL lexicalization predicates
        let prefLabelClashMode = VBContext.getWorkingProjectCtx().getProjectSettings().prefLabelClashMode;
        let checkClash: boolean = prefLabelClashMode != PrefLabelClashMode.allow; //enable the clash checks only if not "allow" ("forbid"|"warning")
        if (
            predicate.equals(SKOSXL.prefLabel) || predicate.equals(SKOSXL.altLabel) || predicate.equals(SKOSXL.hiddenLabel) ||
            predicate.equals(SKOS.prefLabel) || predicate.equals(SKOS.altLabel) || predicate.equals(SKOS.hiddenLabel)
        ) {
            labels.forEach((label: ARTLiteral) => {
                addFunctions.push({
                    function: this.lexicalizationEnrichmentHelper.getAddLabelFn(<ARTURIResource>this.resource, predicate, label, cls, checkClash, checkClash, false),
                    value: label
                });
            });
            errorHandler = (errors: MultiActionError[]) => {
                if (errors.length == 1) { //if only one error, try to handle it
                    let err: MultiActionError = errors[0];
                    if (
                        ((err.error.name.endsWith("PrefPrefLabelClashException") || err.error.name.endsWith("PrefAltLabelClashException")) && prefLabelClashMode == PrefLabelClashMode.warning) ||
                        err.error.name.endsWith("BlacklistForbiddendException")
                    ) {
                        this.lexicalizationEnrichmentHelper.handleForceAddLexicalizationError(err.error, <ARTURIResource>this.resource, predicate, <ARTLiteral>err.value, cls, checkClash, checkClash, false, { eventEmitter: this.update });
                    } else { //other error that cannot be handled with a "force action"
                        this.handleSingleMultiAddError(err);
                    }
                } else {
                    this.handleMultipleMultiAddError(errors);
                }
            };
        } else { //rdfs:label (or maybe a custom property) for which doens't exist a dedicated service
            labels.forEach((label: ARTLiteral) => {
                addFunctions.push({
                    function: this.resourcesService.addValue(this.resource, predicate, label),
                    value: label
                });
            });
        }
        this.addMultiple(addFunctions, errorHandler);
    }

    getPredicateToEnrich(): Observable<ARTURIResource> {
        return from(
            this.browsingModals.browsePropertyTree({ key: "DATA.ACTIONS.SELECT_PROPERTY" }, null, <ARTURIResource>this.resource).then(
                selectedProp => {
                    return selectedProp;
                },
                () => { return null; }
            )
        );
    }

    checkTypeCompliantForManualAdd(predicate: ARTURIResource, value: ARTNode): Observable<boolean> {
        return this.propService.getRange(predicate).pipe(
            mergeMap(range => {
                return of(RangeResponse.isRangeCompliant(range, value));
            })
        );
    }

    removePredicateObject(predicate: ARTURIResource, object: ARTNode) {
        this.getRemoveFunction(predicate, object).subscribe(
            stResp => this.update.emit(null)
        );
    }

    getRemoveFunctionImpl(predicate: ARTURIResource, object: ARTNode): Observable<any> {
        return this.resourcesService.removeValue(this.resource, predicate, object);
    }

    private copyLocaleHandler(predicate: ARTURIResource, eventData: { value: ARTNode, locales: Language[] }) {
        let addFunctions: MultiActionFunction[] = [];
        //this function is the handler of an event invoked in properties only when the value is a plain literal, so the cast is safe
        let value: ARTLiteral = <ARTLiteral>eventData.value;
        eventData.locales.forEach(l => {
            let newValue: ARTLiteral = new ARTLiteral(value.getValue(), null, l.tag);
            addFunctions.push({
                function: this.resourcesService.addValue(<ARTURIResource>this.resource, predicate, newValue),
                value: newValue
            });
        });
        this.addMultiple(addFunctions);
    }

}