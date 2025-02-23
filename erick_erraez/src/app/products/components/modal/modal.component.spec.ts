import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debería emitir confirm al llamar onConfirm()', () => {
    jest.spyOn(component.confirm, 'emit');
    component.onConfirm();
    expect(component.confirm.emit).toHaveBeenCalled();
  });

  it('debería emitir cancel al llamar onCancel()', () => {
    jest.spyOn(component.cancel, 'emit');
    component.onCancel();
    expect(component.cancel.emit).toHaveBeenCalled();
  });

  it('debería mostrar el title y message en la plantilla', () => {
    component.title = 'Eliminar producto';
    component.message = 'Producto XYZ';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // Suponiendo que en la plantilla se usan <p class="modal-question">
    expect(compiled.querySelector('.modal-question')?.textContent).toContain(
      '¿Estás seguro de eliminar'
    );
    expect(compiled.querySelector('.modal-question')?.textContent).toContain(
      'Producto XYZ'
    );
  });
});
