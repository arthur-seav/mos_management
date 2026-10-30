package mos.management.dashboard.service.payment;

import mos.management.dashboard.dto.OrderDtos.CardView;
import mos.management.dashboard.dto.OrderDtos.NewCardRequest;
import mos.management.dashboard.entity.SavedCard;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.SavedCardRepository;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.util.Text;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;

/** Saved cards: only the gateway token and "•••• 4242" are kept (data dictionary). */
@Service
@Transactional
public class CardService {

    private final SavedCardRepository cards;
    private final UserRepository users;
    private final PaymentGateway gateway;
    private final Clock clock;

    public CardService(SavedCardRepository cards, UserRepository users, PaymentGateway gateway, Clock clock) {
        this.cards = cards;
        this.users = users;
        this.gateway = gateway;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CardView> cards(long userId) {
        return cards.findByUserIdOrderByIdAsc(userId).stream().map(CardView::of).toList();
    }

    public CardView add(long userId, NewCardRequest req) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        PaymentGateway.CardToken token;
        try {
            token = gateway.tokenize(req.number(), req.expiryMonth(), req.expiryYear(), req.cvv());
        } catch (PaymentGateway.CardRejected e) {
            throw ApiException.badRequest("card_rejected", e.getMessage());
        }
        SavedCard card = new SavedCard(user, token.token(), token.brand(), "•••• •••• •••• " + token.last4(),
                req.expiryMonth(), req.expiryYear(), Text.blankToNull(req.holderName()), clock.instant());
        return CardView.of(cards.save(card));
    }
}
