package mos.management.dashboard.web.app;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.OrderDtos.CardPaymentRequest;
import mos.management.dashboard.dto.OrderDtos.CardView;
import mos.management.dashboard.dto.OrderDtos.KhqrChargeView;
import mos.management.dashboard.dto.OrderDtos.NewCardRequest;
import mos.management.dashboard.dto.OrderDtos.OrderRequest;
import mos.management.dashboard.dto.OrderDtos.OrderView;
import mos.management.dashboard.dto.OrderDtos.PaymentView;
import mos.management.dashboard.service.auth.CurrentUser;
import mos.management.dashboard.service.order.OrderService;
import mos.management.dashboard.service.payment.CardService;
import mos.management.dashboard.service.payment.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Orders, payments and saved cards for the signed-in customer (FR-10 to FR-18). */
@RestController
@RequestMapping("/api/app")
public class AppOrderController {

    private final OrderService orders;
    private final PaymentService payments;
    private final CardService cards;
    private final CurrentUser currentUser;

    public AppOrderController(OrderService orders, PaymentService payments, CardService cards, CurrentUser currentUser) {
        this.orders = orders;
        this.payments = payments;
        this.cards = cards;
        this.currentUser = currentUser;
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderView create(@Valid @RequestBody OrderRequest body) {
        return OrderView.of(orders.createOnline(currentUser.id(), body));
    }

    @GetMapping("/orders")
    public List<OrderView> history() {
        return orders.history(currentUser.id()).stream().map(OrderView::of).toList();
    }

    /** Polled by the tracking page (FR-15, NFR-02). */
    @GetMapping("/orders/{id}")
    public OrderView order(@PathVariable long id) {
        return OrderView.of(orders.customerOrder(currentUser.id(), id));
    }

    @PostMapping("/orders/{id}/cancel")
    public OrderView cancel(@PathVariable long id) {
        return OrderView.of(orders.cancel(currentUser.id(), id));
    }

    @PostMapping("/orders/{id}/payments/khqr")
    @ResponseStatus(HttpStatus.CREATED)
    public KhqrChargeView startKhqr(@PathVariable long id) {
        return payments.startKhqr(currentUser.id(), id);
    }

    @PostMapping("/orders/{id}/payments/card")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentView payWithCard(@PathVariable long id, @Valid @RequestBody CardPaymentRequest body) {
        return PaymentView.of(payments.payWithCard(currentUser.id(), id, body.cardId()));
    }

    @GetMapping("/payments/{id}")
    public PaymentView payment(@PathVariable long id) {
        return PaymentView.of(payments.check(currentUser.id(), id));
    }

    @PostMapping("/payments/{id}/cancel")
    public PaymentView cancelPayment(@PathVariable long id) {
        return PaymentView.of(payments.cancel(currentUser.id(), id));
    }

    @GetMapping("/cards")
    public List<CardView> cards() {
        return cards.cards(currentUser.id());
    }

    @PostMapping("/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public CardView addCard(@Valid @RequestBody NewCardRequest body) {
        return cards.add(currentUser.id(), body);
    }
}
