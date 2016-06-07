import {Component} from "@angular/core";
import {Router, RouterLink} from '@angular/router-deprecated';
import {RdfResourceComponent} from "../../widget/rdfResource/rdfResourceComponent";
import {ModalServices} from "../../widget/modal/modalServices";
import {BrowsingServices} from "../../widget/modal/browsingModal/browsingServices";
import {ARTURIResource, RDFResourceRolesEnum} from "../../utils/ARTResources";
import {VocbenchCtx} from "../../utils/VocbenchCtx";
import {IcvServices} from "../../services/icvServices";
import {SkosServices} from "../../services/skosServices";

@Component({
    selector: "dangling-concept-component",
    templateUrl: "app/src/icv/danglingConcept/danglingConceptComponent.html",
    providers: [IcvServices, SkosServices, BrowsingServices],
    directives: [RdfResourceComponent, RouterLink],
    host: { class : "pageComponent" }
})
export class DanglingConceptComponent {
    
    private schemeList: Array<ARTURIResource>;
    private selectedScheme: ARTURIResource;
    private brokenConceptList: Array<ARTURIResource>;
    
    constructor(private icvService: IcvServices, private skosService: SkosServices, private vbCtx: VocbenchCtx, 
        private modalService: ModalServices, private browsingService: BrowsingServices, private router: Router) {
        //navigate to Home view if not authenticated
        if (vbCtx.getAuthenticationToken() == undefined) {
            router.navigate(['Home']);
        } else if (vbCtx.getWorkingProject() == undefined) {//navigate to Projects view if a project is not selected
            router.navigate(['Projects']);
        }
    }
    
    ngOnInit() {
        this.skosService.getAllSchemesList().subscribe(
            schemeList => {
                this.schemeList = schemeList;
                var currentScheme = this.vbCtx.getScheme();
                if (currentScheme != null) {
                    for (var i = 0; i < this.schemeList.length; i++) {
                        if (this.schemeList[i].getURI() == currentScheme.getURI()) {
                            this.selectedScheme = this.schemeList[i];
                            break;
                        }
                    }
                }
            }
        );
    }
    
    /**
     * Run the check
     */
    private runIcv() {
        document.getElementById("blockDivIcv").style.display = "block";
        this.icvService.listDanglingConcepts(this.selectedScheme).subscribe(
            stResp => {
                this.brokenConceptList = new Array();
                var recordColl = stResp.getElementsByTagName("record");
                for (var i = 0; i < recordColl.length; i++) {
                    var dc = new ARTURIResource(recordColl[i].getAttribute("concept"), recordColl[i].getAttribute("concept"), RDFResourceRolesEnum.concept);
                    this.brokenConceptList.push(dc);
                }
                document.getElementById("blockDivIcv").style.display = "none"
            },
            err => { document.getElementById("blockDivIcv").style.display = "none"; }
        );
    }
    
    /**
     * Fixes concept by setting the concept as topConceptOf the current scheme 
     */
    private setAsTopConcept(concept: ARTURIResource) {
        this.skosService.addTopConcept(concept, this.selectedScheme).subscribe(
            data => {
                //remove the concept from the danglingConceptList
                this.brokenConceptList.splice(this.brokenConceptList.indexOf(concept), 1);
            }
        );
    }
    
    /**
     * Fixes all concepts by setting them all as topConceptOf the current scheme
     */
    private setAllTopConcept() {
        this.icvService.setAllDanglingAsTopConcept(this.brokenConceptList, this.selectedScheme).subscribe(
            stResp => {
                this.brokenConceptList = [];//reset the dangling concept list
            }
        )
    }
    
    /**
     * Fixes concept by selecting a broader concept
     */
    private selectBroader(concept: ARTURIResource) {
        this.browsingService.browseConceptTree("Select a skos:broader", this.selectedScheme, true).then(
            broader => {
                this.skosService.addBroaderConcept(concept, broader).subscribe(
                    stResp => {
                        //remove the concept from the danglingConceptList
                        this.brokenConceptList.splice(this.brokenConceptList.indexOf(concept), 1);
                    }
                )
            },
            () => {}
        );
    }
    
    /**
     * Fixes all concepts by selecting a broader concept for them all 
     */
    private selectBroaderForAll() {
        this.browsingService.browseConceptTree("Select a skos:broader", this.selectedScheme, false).then(
            broader => {
                this.icvService.setBroaderForAllDangling(this.brokenConceptList, broader).subscribe(
                    stResp => {
                        this.brokenConceptList = [];
                    }
                )
            },
            () => {}
        );
    }
    
    /**
     * Fixes concept by removing the concept from the current scheme 
     */
    private removeFromScheme(concept: ARTURIResource) {
        this.modalService.confirm("Remove from scheme", "Warning, if this concept has narrowers, removing the " +
                "dangling concept from the scheme may generate other dangling concepts. Are you sure to proceed?").then(
            result => {
                this.skosService.removeConceptFromScheme(concept, this.selectedScheme).subscribe(
                    data => {
                        //remove the concept from the danglingConceptList
                        this.brokenConceptList.splice(this.brokenConceptList.indexOf(concept), 1);
                    }
                );
            },
            () => {}
        );
    }
    
    /**
     * Fixes concepts by removing them all from the current scheme 
     */
    private removeAllFromScheme() {
        this.modalService.confirm("Remove from scheme", "Warning, if the concepts have narrowers, removing them " +
                "may generate other dangling concepts. Are you sure to proceed?").then(
            result => {
                this.icvService.removeAllConceptsFromScheme(this.brokenConceptList, this.selectedScheme).subscribe(
                    stResp => {
                        this.brokenConceptList = [];
                    }
                );
            },
            () => {}
        );
    }
    
}