import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ARTResource, ARTURIResource } from 'src/app/models/ARTResources';
import { ModalOptions, TextOrTranslation, TranslationUtils } from 'src/app/widget/modal/Modals';
import { LexicalRelationModal, LexicoRelationModalReturnData } from './lexicalRelation/lexicalRelationModal';

@Injectable()
export class LexViewModalService {

    constructor(private modalService: NgbModal, private translateService: TranslateService) { }

    createRelation(title: TextOrTranslation, sourceEntity: ARTResource, relationClass: ARTURIResource): Promise<LexicoRelationModalReturnData> {
        const modalRef: NgbModalRef = this.modalService.open(LexicalRelationModal, new ModalOptions());
        modalRef.componentInstance.title = TranslationUtils.getTranslatedText(title, this.translateService);
        modalRef.componentInstance.sourceEntity = sourceEntity;
        modalRef.componentInstance.relationClass = relationClass;
        return modalRef.result;
    }

}
