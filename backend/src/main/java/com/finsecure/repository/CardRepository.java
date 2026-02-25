package com.finsecure.repository;

import com.finsecure.entity.Card;
import com.finsecure.entity.Card.CardType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {

    List<Card> findByAccountCustomerId(Long customerId);

    boolean existsByAccountIdAndCardType(Long accountId, CardType cardType);

    boolean existsByAccountIdAndCardTypeAndVariant(Long accountId, CardType cardType, String variant);

    boolean existsByAccountIdAndCardTypeAndScheme(Long accountId, CardType cardType, String scheme);
}
