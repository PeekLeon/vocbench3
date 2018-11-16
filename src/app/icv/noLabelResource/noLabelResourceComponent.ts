import { Component } from "@angular/core";
import { ARTLiteral, ARTResource, ARTURIResource } from "../../models/ARTResources";
import { RDFS, SKOS, SKOSXL } from "../../models/Vocabulary";
import { IcvServices } from "../../services/icvServices";
import { PropertyServices } from "../../services/propertyServices";
import { ResourcesServices } from "../../services/resourcesServices";
import { SkosServices } from "../../services/skosServices";
import { SkosxlServices } from "../../services/skosxlServices";
import { VBContext } from "../../utils/VBContext";
import { CreationModalServices } from "../../widget/modal/creationModal/creationModalServices";
import { NewXLabelModalReturnData } from "../../widget/modal/creationModal/newResourceModal/skos/newXLabelModal";
import { SharedModalServices } from "../../widget/modal/sharedModal/sharedModalServices";

@Component({
    selector: "no-label-resource-component",
    templateUrl: "./noLabelResourceComponent.html",
    host: { class: "pageComponent" }
})
export class NoLabelResourceComponent {

    private brokenResourceList: Array<ARTResource>;
    private lexicalizationModel: string;
    private title: string;
    private message: string;
    private actionLabel: string;

    constructor(private icvService: IcvServices, private skosService: SkosServices, private skosxlService: SkosxlServices,
        private resourcesService: ResourcesServices, private propService: PropertyServices,
        private creationModals: CreationModalServices, private sharedModals: SharedModalServices) { }

    ngOnInit() {
        this.lexicalizationModel = VBContext.getWorkingProject().getLexicalizationModelType();
        if (this.lexicalizationModel == SKOS.uri) {
            this.title = "No skos:prefLabel resource";
            this.message = "skos:Concept(s), skos:ConceptScheme(s) and skos:Collection(s) that don't have a skos:prefLabel."
            this.actionLabel = "Add skos:prefLabel";
        } else if (this.lexicalizationModel == SKOSXL.uri) {
            this.title = "No skosxl:prefLabel resource";
            this.message = "skos:Concept(s), skos:ConceptScheme(s) and skos:Collection(s) that don't have a skos:prefLabel."
            this.actionLabel = "Add skosxl:prefLabel";
        } else if (this.lexicalizationModel == RDFS.uri) {
            this.title = "No rdfs:label resource";
            this.message = "owl:Class(es) and instances that don't have a rdfs:label."
            this.actionLabel = "Add rdfs:label";
        }
    }

    /**
     * Run the check
     */
    runIcv() {
        if (this.lexicalizationModel == SKOS.uri) {
            this.icvService.listResourcesWithNoSKOSPrefLabel().subscribe(
                brokenRes => {
                    this.brokenResourceList = brokenRes;
                }
            );
        } else if (this.lexicalizationModel == SKOSXL.uri) {
            this.icvService.listResourcesWithNoSKOSXLPrefLabel().subscribe(
                brokenRes => {
                    this.brokenResourceList = brokenRes;
                }
            );
        } else { //OWL
            //TODO
        }
    }

    /**
     * Fixes resource by setting a label 
     */
    fix(resource: ARTURIResource) {
        if (this.lexicalizationModel == SKOS.uri) {
            this.creationModals.newPlainLiteral("Add skos:prefLabel").then(
                (literal: any) => {
                    this.skosService.setPrefLabel(resource, literal).subscribe(
                        stResp => {
                            this.runIcv();
                        }
                    )
                },
                () => { }
            );
        } else if (this.lexicalizationModel == SKOSXL.uri) {
            this.creationModals.newXLabel("Add skosxl:prefLabel").then(
                (data: NewXLabelModalReturnData) => {
                    this.skosxlService.setPrefLabel(resource, data.labels[0], data.cls).subscribe(
                        stResp => {
                            this.runIcv();
                        }
                    )
                },
                () => { }
            );
        } else { //OWL 
            this.creationModals.newPlainLiteral("Add rdfs:label").then(
                (literal: any) => {
                    this.resourcesService.addValue(resource, RDFS.label,(<ARTLiteral>literal)).subscribe(
                        stResp => {
                            this.runIcv();
                        }
                    )
                },
                () => { }
            );
        }
    }

    onResourceClick(res: ARTResource) {
        this.sharedModals.openResourceView(res, false);
    }

}